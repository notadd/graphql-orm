SELECT 
    "User"."id" AS "User_id", 
    "User__posts"."id" AS "User__posts_id", 
    "User__posts"."create_user_id" AS "User__posts_create_user_id", 
    "User__posts__createUser"."id" AS "User__posts__createUser_id" 
FROM "user" "User" 
LEFT JOIN "post" "User__posts" ON "User__posts"."create_user_id"="User"."id"  
LEFT JOIN "user" "User__posts__createUser" ON "User__posts__createUser"."id"="User__posts"."create_user_id" 
WHERE "User"."id" = $1

SELECT 
    "Post"."id" AS "Post_id", 
    "Post__createUser"."id" AS "Post__createUser_id", 
    "Post__likeUsers"."id" AS "Post__likeUsers_id", 
    "Post__likeUsers__posts"."id" AS "Post__likeUsers__posts_id", 
    "Post__likeUsers__posts"."create_user_id" AS "Post__likeUsers__posts_create_user_id" 
FROM "post" "Post" 
LEFT JOIN "user" "Post__createUser" ON "Post__createUser"."id"="Post"."create_user_id"  
LEFT JOIN "user_like_post" "Post__likeUsers_Post" ON "Post__likeUsers_Post"."postId"="Post"."id" 
LEFT JOIN "user" "Post__likeUsers" ON "Post__likeUsers"."id"="Post__likeUsers_Post"."userId"  
LEFT JOIN "post" "Post__likeUsers__posts" ON "Post__likeUsers__posts"."create_user_id"="Post__likeUsers"."id" 
WHERE "Post"."id" = $1