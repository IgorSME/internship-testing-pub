import { TypeOrmModule } from '@db/typeorm.config';
import { AuthModule } from '@entities/auth/auth.module';
import { InternshipStreamModule } from '@entities/internship-stream/internship-stream.module';
import { MailModule } from '@entities/mail/mail.module';
import { QuestionsModule } from '@entities/questions/questions.module';
import { UserModule } from '@entities/users/users.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from './config.module';
import { AttemptsModule } from './entities/attempts/attempts.module';
import { DirectionModule } from './entities/direction/direction.module';
import { GoogleModule } from './entities/google/google.module';
import { MaterialsModule } from './entities/materials/materials.module';
import { QuestionsBlockModule } from './entities/questions-block/questions-block.module';
import { TestResultModule } from './entities/test-result/test-result.module';
import { TestsModule } from './entities/tests/tests.module';
import { UploadModule } from './entities/upload/upload.module';
import { CorsMiddleware } from './middlewares/cors-middleware';
import { TechnicalTestModule } from '@entities/technical-test/technical-test.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    ConfigModule,
    TypeOrmModule,
    AuthModule,
    UserModule,
    MailModule,
    QuestionsModule,
    GoogleModule,
    UploadModule,
    InternshipStreamModule,
    MaterialsModule,
    QuestionsBlockModule,
    DirectionModule,
    TestsModule,
    TestResultModule,
    AttemptsModule,
    TechnicalTestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*');
  }
}
