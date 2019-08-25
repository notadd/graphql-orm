import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, BaseEntity, ManyToMany } from '../../lib';
import { User } from './user'

@Entity()
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, type => type.posts, {
        cascade: ['insert', 'update']
    })
    @JoinColumn({
        name: 'create_user_id'
    })
    createUser: User;

    @Column({
        name: 'create_user_id',
        nullable: true
    })
    createUserId: number;

    @ManyToMany(() => User, type => type.likes, {
        cascade: ['insert', 'update']
    })
    likeUsers: User[];
}