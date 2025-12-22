import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

type Metric =
  | 'current_vehicles'
  | 'flow_total'
  | 'vehicles_avg'
  | 'vehicles_peak'
  | 'flow_peak_time';

type Scope = 'all' | 'intersection' | 'camera';
type TimePreset = 'last_15m' | 'last_60m' | 'today' | 'yesterday' | 'custom';

type TrafficIntent = {
  kind: 'traffic';
  metric: Metric;
  scope: Scope;
  intersectionName?: string;
  cameraName?: string;
  time: {
    preset: TimePreset;
    fromISO?: string;
    toISO?: string;
  };
};

type GeneralIntent = {
  kind: 'general';
  topic: 'identity' | 'capabilities' | 'other';
};

type ChatIntent = TrafficIntent | GeneralIntent;

const ASSISTANT_IDENTITY = `
  Mình là trợ lý ảo của hệ thống giám sát & điều khiển giao thông thông minh (Smart Traffic Lights).
  Mình có thể tra cứu dữ liệu từ camera/giao lộ, thống kê lưu lượng theo thời gian, và hỗ trợ giải thích trạng thái/log đèn tín hiệu.`.trim();

const ASSISTANT_CAPABILITIES = `
  Mình có thể:
  1) Tra cứu danh sách giao lộ/camera trong hệ thống.
  2) Trả lời số liệu: số xe hiện tại, tổng xe đi qua (flow), trung bình/đỉnh theo khoảng thời gian.
  3) Xem log thay đổi đèn tín hiệu và lý do điều khiển.
  4) Hỗ trợ vận hành/giám sát dựa trên dữ liệu DB.`.trim();

const PLANNER_SYSTEM = `
  Bạn là bộ phân loại intent cho trợ lý giao thông.
  Chỉ trả JSON (không markdown, không giải thích) theo 1 trong 2 dạng:

  A) Câu hỏi chung (vd: "Bạn là ai?", "Bạn làm được gì?", chào hỏi):
  {"kind":"general","topic":"identity|capabilities|other"}

  B) Câu hỏi nghiệp vụ cần truy vấn dữ liệu (xe, lưu lượng, camera, giao lộ, đèn, log):
  {
    "kind":"traffic",
    "metric":"current_vehicles|flow_total|vehicles_avg|vehicles_peak|flow_peak_time",
    "scope":"all|intersection|camera",
    "intersectionName"?: string,
    "cameraName"?: string,
    "time": {
      "preset":"last_15m|last_60m|today|yesterday|custom",
      "fromISO"?: string,
      "toISO"?: string
    }
  }

  Quy tắc:
  - "Bạn là ai" => general.identity
  - "Bạn làm được gì" => general.capabilities
  - Nếu có từ khoá: xe, lưu lượng, đi qua, thống kê, camera, giao lộ, đèn, log, khẩn cấp, traffic => traffic
  - Nếu hỏi "hiện tại đang có bao nhiêu xe" => metric=current_vehicles
  - Nếu hỏi "tính đến hiện tại / từ đầu ngày đến giờ / tổng xe" => metric=flow_total, time.preset=today
  - Nếu hỏi "đông nhất đi qua vào thời gian nào" => metric=flow_peak_time (ưu tiên hiểu 'đi qua' là flowCount)
  - Nếu không nêu thời gian => mặc định time.preset=today cho flow_* và last_15m cho current_vehicles
  - Nếu nhắc giao lộ => scope=intersection + intersectionName
  - Nếu nhắc camera => scope=camera + cameraName
  - Nếu không nhắc phạm vi => scope=all`.trim();

const ANSWER_SYSTEM = `
  Bạn là trợ lý ảo của hệ thống giám sát & điều khiển giao thông thông minh (Smart Traffic Lights).

  Bạn sẽ nhận một JSON gồm:
  - question: câu hỏi người dùng
  - intent: intent đã được chuẩn hoá
  - data: dữ liệu truy vấn từ DB (đây là nguồn sự thật)

  Nhiệm vụ: trả lời tự nhiên, ngắn gọn, đúng số liệu. 
  Quy tắc:
  - KHÔNG bịa dữ liệu. Chỉ dùng những gì có trong data.
  - Nếu data có epoch seconds (minuteStart), hãy đổi sang giờ Việt Nam (Asia/Ho_Chi_Minh).
  - Nếu thiếu dữ liệu thì nói rõ "Chưa có dữ liệu trong khoảng thời gian yêu cầu".
  - Ưu tiên 1-3 câu; nếu cần chi tiết có thể thêm bullet.`.trim();

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async processMessage(userMessage: string) {
    try {
      // 1) Extract intent/router
      const intent = await this.extractIntent(userMessage);

      if (intent.kind === 'general') {
        if (intent.topic === 'identity') return { reply: ASSISTANT_IDENTITY };
        if (intent.topic === 'capabilities')
          return { reply: ASSISTANT_CAPABILITIES };

        const resp = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Bạn là trợ lý ảo của hệ thống giám sát giao thông. Trả lời ngắn gọn, thân thiện.',
            },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
        });
        return {
          reply:
            resp.choices[0]?.message?.content ??
            'Mình có thể hỗ trợ bạn tra cứu số liệu giao thông và log hệ thống.',
        };
      }

      // Execute DB query
      const data = await this.executeIntent(intent);
      const composed = await this.composeAnswer(userMessage, intent, data);
      if (!composed) {
        return { reply: this.formatResult(intent, data) };
      }

      return { reply: composed };
    } catch (error: any) {
      const status = error?.status;
      const msg = error?.message ?? String(error);
      this.logger.error(
        `Chat error status=${status} message=${msg}`,
        error?.stack,
      );

      if (status === 429) {
        return {
          reply:
            'OpenAI API đang hết quota / bị giới hạn. Bạn cần nạp credit hoặc đổi key.',
        };
      }
      return { reply: `Lỗi: ${msg}` };
    }
  }

  private async extractIntent(userMessage: string): Promise<ChatIntent> {
    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PLANNER_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' } as any,
      temperature: 0,
    });

    const raw = resp.choices[0]?.message?.content ?? '{}';

    try {
      const parsed = JSON.parse(raw) as ChatIntent;
      if (parsed.kind === 'traffic') {
        parsed.time ??= {
          preset: parsed.metric === 'current_vehicles' ? 'last_15m' : 'today',
        };
        parsed.time.preset ??=
          parsed.metric === 'current_vehicles' ? 'last_15m' : 'today';
      }
      return parsed;
    } catch {
      return { kind: 'general', topic: 'other' };
    }
  }

  private computeRangeSeconds(time: TrafficIntent['time']): {
    fromSec: number;
    toSec: number;
  } {
    const now = new Date();
    const toSec = Math.floor(now.getTime() / 1000);

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayFromSec = Math.floor(startOfToday.getTime() / 1000);

    if (time.preset === 'today') return { fromSec: todayFromSec, toSec };
    if (time.preset === 'yesterday') {
      const y0 = new Date(startOfToday);
      y0.setDate(y0.getDate() - 1);
      const y1 = new Date(startOfToday);
      return {
        fromSec: Math.floor(y0.getTime() / 1000),
        toSec: Math.floor(y1.getTime() / 1000),
      };
    }
    if (time.preset === 'last_60m') return { fromSec: toSec - 60 * 60, toSec };
    if (time.preset === 'last_15m') return { fromSec: toSec - 15 * 60, toSec };

    // custom
    const from = time.fromISO
      ? new Date(time.fromISO)
      : new Date(toSec * 1000 - 15 * 60 * 1000);
    const to = time.toISO ? new Date(time.toISO) : now;
    return {
      fromSec: Math.floor(from.getTime() / 1000),
      toSec: Math.floor(to.getTime() / 1000),
    };
  }

  private async resolveCameraIds(intent: TrafficIntent): Promise<number[]> {
    if (intent.scope === 'camera' && intent.cameraName) {
      const cam = await this.prisma.camera.findFirst({
        where: { name: { contains: intent.cameraName, mode: 'insensitive' } },
        select: { id: true },
      });
      return cam ? [cam.id] : [];
    }

    if (intent.scope === 'intersection' && intent.intersectionName) {
      const cams = await this.prisma.camera.findMany({
        where: {
          intersection: {
            name: { contains: intent.intersectionName, mode: 'insensitive' },
          },
        },
        select: { id: true },
      });
      return cams.map((c) => c.id);
    }

    const cams = await this.prisma.camera.findMany({ select: { id: true } });
    return cams.map((c) => c.id);
  }

  private async executeIntent(intent: TrafficIntent): Promise<any> {
    const cameraIds = await this.resolveCameraIds(intent);
    if (cameraIds.length === 0)
      return { error: 'Không tìm thấy camera phù hợp.' };

    const { fromSec, toSec } = this.computeRangeSeconds(intent.time);

    // tổng vehicles từ frame mới nhất mỗi camera
    if (intent.metric === 'current_vehicles') {
      const latest = await Promise.all(
        cameraIds.map(async (cameraId) => {
          const row = await this.prisma.trafficFrameStat.findFirst({
            where: { cameraId },
            orderBy: { capturedAt: 'desc' },
            select: {
              vehicles: true,
              capturedAt: true,
              isEmergency: true,
              cameraId: true,
            },
          });
          return row;
        }),
      );

      const rows = latest.filter(Boolean);
      const total = rows.reduce((s, r) => s + (r?.vehicles ?? 0), 0);
      return { total, rows };
    }

    const where = {
      cameraId: { in: cameraIds },
      minuteStart: { gte: fromSec, lte: toSec },
    };

    if (intent.metric === 'flow_total') {
      const agg = await this.prisma.trafficMinuteSummary.aggregate({
        where,
        _sum: { flowCount: true },
      });
      return { fromSec, toSec, totalFlow: agg._sum.flowCount ?? 0 };
    }

    if (intent.metric === 'vehicles_avg') {
      const agg = await this.prisma.trafficMinuteSummary.aggregate({
        where,
        _avg: { vehiclesAvg: true },
      });
      return { fromSec, toSec, avgVehicles: agg._avg.vehiclesAvg ?? 0 };
    }

    if (intent.metric === 'vehicles_peak') {
      const agg = await this.prisma.trafficMinuteSummary.aggregate({
        where,
        _max: { vehiclesMax: true },
      });
      return { fromSec, toSec, peakVehicles: agg._max.vehiclesMax ?? 0 };
    }

    // phút có tổng flowCount lớn nhất
    if (intent.metric === 'flow_peak_time') {
      const top = await this.prisma.trafficMinuteSummary.groupBy({
        by: ['minuteStart'],
        where,
        _sum: { flowCount: true },
        orderBy: { _sum: { flowCount: 'desc' } },
        take: 1,
      });

      if (!top.length)
        return { error: 'Chưa có dữ liệu trong khoảng thời gian yêu cầu.' };

      const peakMinuteStart = top[0].minuteStart;
      const peakFlow = top[0]._sum.flowCount ?? 0;

      const breakdown = await this.prisma.trafficMinuteSummary.findMany({
        where: { ...where, minuteStart: peakMinuteStart },
        select: {
          cameraId: true,
          flowCount: true,
          vehiclesMax: true,
          camera: { select: { name: true } },
        },
        orderBy: { flowCount: 'desc' },
      });

      return { fromSec, toSec, peakMinuteStart, peakFlow, breakdown };
    }

    return { error: 'Metric không hỗ trợ.' };
  }

  private async composeAnswer(
    question: string,
    intent: TrafficIntent,
    data: any,
  ): Promise<string | null> {
    try {
      const resp = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANSWER_SYSTEM },
          {
            role: 'user',
            content: JSON.stringify({ question, intent, data }),
          },
        ],
        temperature: 0.3,
      });

      return resp.choices[0]?.message?.content ?? null;
    } catch (e: any) {
      this.logger.warn(`composeAnswer failed: ${e?.message ?? e}`);
      return null;
    }
  }

  private fmtVNFromEpochSeconds(sec: number): string {
    return new Date(sec * 1000).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  }

  private formatResult(intent: TrafficIntent, result: any): string {
    if (result?.error) return result.error;

    const scopeLabel =
      intent.scope === 'all'
        ? 'toàn hệ thống'
        : intent.scope === 'intersection'
          ? `giao lộ "${intent.intersectionName ?? ''}"`
          : `camera "${intent.cameraName ?? ''}"`;

    if (intent.metric === 'current_vehicles') {
      return `Hiện tại (${scopeLabel}) đang ghi nhận khoảng **${result.total} xe** (tổng từ frame mới nhất các camera).`;
    }

    if (intent.metric === 'flow_total') {
      return `Tổng số xe đi qua (flowCount) ${scopeLabel} trong khoảng thời gian yêu cầu là **${result.totalFlow} xe**.`;
    }

    if (intent.metric === 'vehicles_avg') {
      return `Mật độ trung bình (vehiclesAvg) ${scopeLabel} trong khoảng thời gian yêu cầu là **${result.avgVehicles.toFixed(2)} xe**.`;
    }

    if (intent.metric === 'vehicles_peak') {
      return `Đỉnh mật độ (vehiclesMax) ${scopeLabel} trong khoảng thời gian yêu cầu là **${result.peakVehicles} xe**.`;
    }

    if (intent.metric === 'flow_peak_time') {
      const t = this.fmtVNFromEpochSeconds(result.peakMinuteStart);
      return `Thời điểm xe đi qua đông nhất (${scopeLabel}) là **${t}** với **${result.peakFlow} xe/phút**.`;
    }

    return 'OK.';
  }
}
