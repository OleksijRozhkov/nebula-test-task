import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { File } from './files/entities/file.entity';
import { FilesModule } from './files/files.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'file_upload'),
        entities: [File],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
      }),
    }),

    // Application modules
    FilesModule,
    GoogleDriveModule,
  ],
})
export class AppModule {}
