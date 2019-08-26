import { BaseEntity } from '../../lib';
import { Post } from './post';
export declare class User extends BaseEntity {
    id: number;
    posts: Post[];
    likes: Post[];
    get(obj: {
        id: number;
    }): Promise<User>;
}
