import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatQueryDto } from './dto/chat-query.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() dto: ChatQueryDto) {
    return this.chatService.processMessage(dto.message);
  }
}