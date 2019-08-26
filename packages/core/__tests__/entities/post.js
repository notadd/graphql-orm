"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const user_1 = require("./user");
let Post = class Post extends lib_1.BaseEntity {
};
__decorate([
    lib_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Post.prototype, "id", void 0);
__decorate([
    lib_1.ManyToOne(() => user_1.User, type => type.posts, {
        cascade: ['insert', 'update']
    }),
    lib_1.JoinColumn({
        name: 'create_user_id'
    }),
    __metadata("design:type", user_1.User)
], Post.prototype, "author", void 0);
__decorate([
    lib_1.Column({
        name: 'create_user_id',
        nullable: true
    }),
    __metadata("design:type", Number)
], Post.prototype, "authorUid", void 0);
__decorate([
    lib_1.ManyToMany(() => user_1.User, type => type.likes, {
        cascade: ['insert', 'update']
    }),
    __metadata("design:type", Array)
], Post.prototype, "likeUsers", void 0);
Post = __decorate([
    lib_1.Entity()
], Post);
exports.Post = Post;
//# sourceMappingURL=post.js.map