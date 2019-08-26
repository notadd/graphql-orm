import { BaseEntity } from '../../lib';
import { User } from './user';
export declare class Post extends BaseEntity {
    id: number;
    author: User;
    authorUid: number;
    likeUsers: User[];
}
