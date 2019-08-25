import { Entity, PrimaryGeneratedColumn, BaseEntity, createConnection, OneToMany, ManyToOne, ManyToMany, JoinTable } from '../../lib';
import { Post } from './post'
@Entity()
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToMany(() => Post, type => type.author, {
        cascade: ['insert', 'update']
    })
    posts: Post[];

    @ManyToMany(() => Post, type => type.likeUsers, {
        cascade: ['insert', 'update']
    })
    @JoinTable({
        name: 'user_like_post'
    })
    likes: Post[];

    async get(obj: { id: number }): Promise<User> {
        return await User.findOne({
            id: obj.id
        })
    }
}
