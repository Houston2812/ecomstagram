-- CREATE  DATABASE ecomstagram;

-- USE ecomstagram;

CREATE TABLE users(
    id INT PRIMARY KEY AUTO_INCREMENT,
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    date_of_birth VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    specialization VARCHAR(255) DEFAULT "customer",
    email_add VARCHAR(255),
    mobile_number VARCHAR(255),
    profile_description VARCHAR(255),
    profile_picture VARCHAR(255) DEFAULT "default.jpg"
);

CREATE TABLE posts(
    id INT PRIMARY KEY AUTO_INCREMENT,
    pic_name VARCHAR(255),
    profile_id INT NOT NULL,
    likes INT DEFAULT 0,
    price INT NOT NULL,
    description VARCHAR(255), 
    FOREIGN KEY (profile_id) REFERENCES users(id)
);



ALTER TABLE users
ADD status BOOLEAN DEFAULT 0;

ALTER TABLE users
ADD confirmationCode VARCHAR(255) NOT NULL UNIQUE;

CREATE TABLE followers(
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_from INT NOT NULL,
    user_to INT NOT NULL,
    pending BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_from) REFERENCES users(id),
    FOREIGN KEY (user_to) REFERENCES users(id)
);


-- SELECT posts.*, users.username, users.profile_picture FROM posts, users, followers WHERE users.id = posts.profile_id AND users.username != "huseyn12" AND followers.user_from = users.id;