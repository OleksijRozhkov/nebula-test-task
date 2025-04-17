import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  public originalName: string;

  @Column()
  public mimeType: string;

  @Column({ type: 'bigint' })
  public size: number;

  @Column()
  public driveFileId: string;

  @Column()
  public driveFileUrl: string;

  @Column()
  public originalUrl: string;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}
