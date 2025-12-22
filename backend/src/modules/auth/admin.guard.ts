import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * AdminGuard enforces role-based access control.
 * roleId:
 *  - 0: admin
 *  - 1: user
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    if (!user) {
      throw new UnauthorizedException('Missing authentication');
    }

    const roleId = Number(user.roleId);
    if (Number.isNaN(roleId)) {
      throw new ForbiddenException('Missing role');
    }

    if (roleId !== 0) {
      throw new ForbiddenException('Admin only');
    }

    return true;
  }
}
