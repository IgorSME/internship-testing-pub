import { ApiProperty } from '@nestjs/swagger';
import { MyBaseEntity } from '@utils/base.entity';
import { Entity, Column } from 'typeorm';

enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

@Entity()
export class ResultTechnicalTest extends MyBaseEntity {
  @ApiProperty({
    example: 1,
    description: 'User id',
  })
  @Column({ type: 'int' })
  userId: number;

  @ApiProperty({
    example: 'https://livepage.com',
    description: 'Link to live page',
  })
  @Column({ type: 'varchar' })
  livePageLink: string;

  @ApiProperty({
    example: 'https://repository.com',
    description: 'Link to repository',
  })
  @Column({ type: 'varchar' })
  repositoryLink: string;

  @ApiProperty({ enum: Difficulty, default: Difficulty.Easy })
  @Column({ type: 'enum', enum: Difficulty, default: Difficulty.Easy })
  difficulty: Difficulty;

  @ApiProperty({ example: 'Some comments', description: 'Comments' })
  @Column({ type: 'text' })
  comments: string;
}
