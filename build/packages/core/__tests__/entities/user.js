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
var User_1;
Object.defineProperty(exports, "__esModule", { value: true });
"use strict";
const lib_1 = require("../../lib");
const post_1 = require("./post");
let User = User_1 = class User extends lib_1.BaseEntity {
    async get(obj) {
        return await User_1.findOne({
            id: obj.id
        });
    }
};
__decorate([
    lib_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    lib_1.OneToMany(() => post_1.Post, type => type.author, {
        cascade: ['insert', 'update']
    }),
    __metadata("design:type", Array)
], User.prototype, "posts", void 0);
__decorate([
    lib_1.ManyToMany(() => post_1.Post, type => type.likeUsers, {
        cascade: ['insert', 'update']
    }),
    lib_1.JoinTable({
        name: 'user_like_post'
    }),
    __metadata("design:type", Array)
], User.prototype, "likes", void 0);
User = User_1 = __decorate([
    lib_1.Entity()
], User);
exports.User = User;
