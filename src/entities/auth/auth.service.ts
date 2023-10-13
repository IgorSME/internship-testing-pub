import { AttemptsService } from '@entities/attempts/attempts.service';
import { InternshipStream } from '@entities/internship-stream/internship-stream.entity';
import { MailService } from '@entities/mail/mail.service';
import { Role } from '@entities/users/role.entity';
import { User } from '@entities/users/users.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { InjectRepository } from '@nestjs/typeorm';
import { ERole } from '@src/enums/role.enum';
import * as regex from '@utils/regex-expressions';
import * as bcrypt from 'bcryptjs';
import * as code from 'country-data';
import { Repository } from 'typeorm';
import { v4 } from 'uuid';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterUserDto } from './dto/create-user.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { PhoneCodeDto } from './dto/phone.dto';

@Injectable()
export class AuthService {
  private readonly countriesCodeAll: any;
  constructor(
    private readonly attemptsService: AttemptsService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(InternshipStream)
    private readonly streamRepository: Repository<InternshipStream>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {
    this.countriesCodeAll = code.countries.all;
  }

  // Register
  async registerUser(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, password } = registerUserDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      throw new ConflictException('User is already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = v4();
    await this.sendEmailHandler(verifyToken, 'verify-email', email, null);

    const role = this.roleRepository.create({
      role: ERole.USER,
    });

    const newUser = this.userRepository.create({
      ...registerUserDto,
      password: hashedPassword,
      verifyToken,
    });
    newUser.roles = [role];

    await this.roleRepository.save(role);
    await this.userRepository.save(newUser);

    return newUser;
  }

  // Verify email
  async verifyEmail(verifyToken: string) {
    const user = await this.userRepository.findOne({
      where: { verifyToken },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update(user.id, {
      verified: true,
      verifyToken: null,
    });
    const tokens = await this.generateTokens(user);
    return {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
    };
  }

  // Login
  public async login(loginDto: LoginDto, userIp: string) {
    const user = await this.userValidate(
      loginDto.email,
      loginDto.password,
      userIp,
    );

    return await this.responseData(user.email);
  }

  // Response data
  public async responseData(email: string) {
    const user = await this.getUser('email', email);
    const tokens = await this.generateTokens(user);
    const roles: string[] = user.roles.map((role) => role.role);
    const stream: InternshipStream = await this.streamRepository.findOne({
      where: { id: user.streamId },
    });
    const streamData = {
      id: stream?.id,
      streamDirection: stream?.streamDirection,
      isActive: stream?.isActive,
      startDate: stream?.startDate,
    };
    const userData = {
      id: user.id,
      roles,
      isLabelStream: user.isLabelStream,
      stream: stream ? streamData : {},
      isVerifiedEmail: user.verified,
      test: {
        isSent: user.isSentTest,
        isSuccess: user.isPassedTest,
      },
      task: {
        isSent: user.isSentTechnicalTask,
        isSuccess: user.isPassedTechnicalTask,
      },
    };
    const responseData: LoginResponseDto = {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      user: userData,
    };

    if (!user.firstName || !user.phone) {
      return responseData;
    }

    userData['firstName'] = user.firstName;
    userData['avatar'] = user.avatar;
    userData['direction'] = user.direction;

    return responseData;
  }

  // Check phone
  public async checkPhone(phone: string) {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (user) {
      throw new ConflictException('Phone number already exists');
    }
    return 'OK';
  }

  // Request change password
  public async requestChangePassword(email: string) {
    const user = await this.getUser('email', email);
    const verifyToken = v4();
    const isSend = await this.sendEmailHandler(
      verifyToken,
      'verify-change-password',
      user.email,
      user.firstName,
    );
    if (!isSend) {
      throw new InternalServerErrorException();
    }

    await this.userRepository.update(user.id, { verifyToken });
    return { message: 'Email send' };
  }

  // Resend email
  public async resendEmail(email: string) {
    const user = await this.getUser('email', email);
    const isSend = await this.sendEmailHandler(
      user.verifyToken,
      'verify-change-password',
      user.email,
      user.firstName,
    );
    if (!isSend) {
      throw new InternalServerErrorException();
    }
    return { message: 'Email resend' };
  }

  // Verify change password
  public async verifyChangePassword(verifyToken: string) {
    const user = await this.getUser('verifyToken', verifyToken);

    await this.userRepository.update(user.id, { verifyToken: null });
    const tokens = await this.generateTokens(user);

    return {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
    };
  }

  // Change password
  public async changePassword(
    changePasswordDto: ChangePasswordDto,
    userId: number,
  ) {
    const { password, confirmPassword } = changePasswordDto;
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const hashPass = await bcrypt.hash(password, 10);
    await this.userRepository.update(userId, { password: hashPass });
    return { message: 'Password changed' };
  }

  // Refresh token
  public async refreshToken(user: User) {
    const tokens = await this.generateTokens(user);
    return {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
    };
  }

  // Get phone code
  public async getPhoneCode() {
    const allCode: PhoneCodeDto[] = [];

    for (const country of this.countriesCodeAll) {
      allCode.push({
        phone_code: country.countryCallingCodes[0],
        name: country.name,
        alpha2: country.alpha2,
        flag_url: `https://flagcdn.com/${country.alpha2.toLowerCase()}.svg`,
      });
    }

    return allCode;
  }

  // User validate
  private async userValidate(email: string, password: string, userIp: string) {
    const user = await this.getUser('email', email);
    if (!user.password) {
      throw new BadRequestException('Update your password');
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      await this.attemptsService.attempts(userIp);
      throw new UnauthorizedException('Password is wrong');
    }
    if (!user.verified) {
      throw new UnauthorizedException('Email not verified');
    }
    await this.attemptsService.deleteAttempts(userIp);
    return user;
  }

  // Get user
  private async getUser(field: string, value: string) {
    const user = await this.userRepository.findOne({
      where: { [field]: value },
      relations: ['roles'],
    });
    if (user) {
      return user;
    }
    throw new NotFoundException('Not found');
  }

  // Get regular expression
  public async getRegularExpression() {
    const linkRegex = new RegExp(regex.linkRegex).toString();
    const telegramRegex = new RegExp(regex.telegramRegex).toString();
    const phoneRegex = new RegExp(regex.phoneRegex).toString();
    const passwordRegex = new RegExp(regex.passwordRegex).toString();
    const emailRegex = new RegExp(regex.emailRegex).toString();

    return {
      linkRegex,
      telegramRegex,
      phoneRegex,
      passwordRegex,
      emailRegex,
    };
  }

  // Logout
  public async logout(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Not found');
    }
    await this.userRepository.update(user.id, {
      refreshToken: null,
      accessToken: null,
    });
  }

  // Generate tokens
  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const roles = user.roles.map((role) =>
      typeof role === 'string' ? role : role.role,
    );

    const payload = { email: user.email, id: user.id, roles };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: process.env.ACCESS_TOKEN_PRIVATE_KEY || 'SUCCESS_TOKEN',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: process.env.REFRESH_TOKEN_PRIVATE_KEY || 'REFRESH_TOKEN',
    });

    await this.userRepository.update(user.id, {
      refreshToken,
      accessToken,
    });

    return {
      refreshToken,
      accessToken,
    };
  }

  // Generate url for email send
  private generateUrlForEmailSend(
    name: string,
    path: string,
    verifyToken: string,
  ) {
    return `<p>Hi ${name}, please confirm that this is your email address</p><a href="${process.env.BASE_URL}/api/auth/${path}/${verifyToken}">Confirm email</a>`;
  }

  // Send email handler
  private async sendEmailHandler(
    verifyToken: string,
    path: string,
    email: string,
    name: string,
  ) {
    if (!verifyToken) {
      throw new ConflictException('Email is already verified');
    }
    const nameForSend = name ? name : email;
    const verifyLink = this.generateUrlForEmailSend(
      nameForSend,
      path,
      verifyToken,
    );
    const isSendEmail = await this.mailService.sendEmail(
      email,
      verifyLink,
      nameForSend,
    );
    if (isSendEmail) {
      return true;
    }
    return false;
  }
}
