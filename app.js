const express = require('express')
const session = require('express-session')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const bcrypt = require('bcryptjs')
const { query } = require('express')
const time = require('express-timestamp')
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const { dir } = require('console')

var app = express()
var port = 3000
app.set('view engine', 'ejs')
app.use('/public',express.static('public'));


app.use(session({
    secret: "fgjdsgsjdlgdsjglsgd",
    resave: false, 
    saveUninitialized: false
}))

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(time.init)
app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : path.join(__dirname,'tmp'),
}));
// app.use(fileUpload());

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'ecomstagram'
})

app.get(['/', '/home'], (req, res) => {
    res.render('welcome', {username: req.session.username})
})

app.get('/registration', (req, res) => {
    res.render('registration', {username_taken: req.session.username_taken, passwords_match: req.session.passwords_match, email_used: req.session.email_used})
})

app.get('/login', (req, res)=> {
    res.render('login',  {is_logged: req.session.is_logged})
})

app.post('/registration', (req, res) => {
    const {username, passw, passw_rep, firstname, lastname, date_of_birth, email_add, mobile_number} = req.body;
    

    
    console.log(username,  passw, passw_rep, firstname, lastname, date_of_birth, email_add, mobile_number);
    let username_query = `select * from users where username = "${username}";`
    let email_query = `select * from users where email_add = "${email_add}";`

    
    if (passw === passw_rep) {
        req.session.passwords_match = true;
        conn.query(username_query, (err, result) => {
            if (err) throw err;
            if (result.length > 0){
                req.session.username_taken = true;
                res.render('registration', {username_taken: req.session.username_taken, passwords_match: req.session.passwords_match, email_used: req.session.email_used})
            }
            else if (result.length == 0) {
                req.session.username_taken = false;
                conn.query(email_query, (err2, result2) => {
                    if (err2) throw err2;
                    if (result2.length > 0){
                        req.session.email_used = true;
                        res.render('registration', {username_taken: req.session.username_taken, passwords_match: req.session.passwords_match, email_used: req.session.email_used})
                    } 
                    else if (result.length == 0){
                        req.session.email_used = false;
                        bcrypt.hash(passw, 10, (err, encPass) => {
                            if (err)
                                throw err;
                            let sql = `INSERT INTO users(firstname, lastname, date_of_birth, username, password, email_add, mobile_number) values ("${firstname}", "${lastname}", "${date_of_birth}", "${username}", "${encPass}", "${email_add}", "${mobile_number}");`
                            conn.query(sql, (err3, result3) => {
                                if (err3) throw(err3);
                                res.redirect('/login')
                            })
                        })
                    }
                })
            }
           
        })
    } else {
        req.session.passwords_match = false;
        res.render('registration', {username_taken: req.session.username_taken, passwords_match: req.session.passwords_match, email_used: req.session.email_used})
    }
})

app.post('/login', (req, res) => {
    const {username, passw}  = req.body;
    let sql = `select * from users where username="${username}";`
    conn.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);

        if (result.length > 0) {
            let compare = bcrypt.compareSync(passw, result[0].password)
            if (compare) {
                req.session.is_logged = true;
                req.session.username = result[0].username;
                req.session.basket = [];
                console.log(username);
                // res.redirect('/users/' + result[0].id)
                res.redirect('/users/')

            }
            else {
                req.session.is_logged = false;
                req.session.username = '';
                res.redirect('/login')
            }
        } else {
            res.redirect('/login')
        }
    })
})

app.get('/logout', (req, res)=>{
    if (req.session.username){
        req.session.destroy()
        res.redirect('/home')
    } else {
        res.redirect('/error')
    }
})

app.get('/error', (req, res) => {
    res.render('error')
})


app.get('/users', (req, res) => {

    if (req.session.username) {
        conn.query(`SELECT * from users where username = "${req.session.username}";`, (err1, res1) => {
            if (err1) throw err1;
            else {
                conn.query(`select posts.* from posts, users where posts.profile_id = users.id and users.username = "${req.session.username}";`, (err2, res2) => {
                    if (err2) throw err2;
                    else {
                        if (res2.length > 0){
                            console.log(res2)
                            res.render('userProfile_upd', {user: res1[0], products: res2})
                        }
                        else{
                            res.render('userProfile_upd', {user:res1[0], products: []})
                        }
                    }
                })
            }
        })
    } else {
        res.redirect('/error')
    }

});


app.get('/users/edit/', (req, res) => {
    
    if (req.session.username) {
        let find_user = `SELECT * FROM users WHERE username = "${req.session.username}";`
        conn.query(find_user, (err, result) => {
            if (err) throw err;
            else{
                // console.log(result);
                res.render('userProfileEdit_upd', {user:result[0]});
            }
        })    
    } else {
        res.redirect('/error')
    }

});


app.post('/users/edit/', (req, res) => {
    if (req.session.username) {
        const {username, firstname, lastname, profile_description, date_of_birth, email_add, mobile_number} = req.body;

        conn.query('UPDATE `users` SET username=?, firstname=?, lastname=?, profile_description=?, date_of_birth=?, email_add=?, mobile_number=? WHERE username = ?',
        [username, firstname, lastname, profile_description ,date_of_birth, email_add, mobile_number, req.session.username], (err, result) => {
            if (err) throw err;
            else{
                // console.log(result);
                req.session.username = username;
                res.redirect("/users/" )
            }
        })
    } else {
        res.redirect('/error')
    }
});


app.post('/users/edit_picture/', (req, res) => {
    if (req.session.username) {
    
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        let targetFile = req.files.target_file;
        let extName = path.extname(targetFile.name);
        let baseName = path.basename(targetFile.name, extName);
        let updatedName = targetFile.tempFilePath.substr(-13, 13) + extName;
        let uploadDir = path.join(__dirname, 'public/profile_pics', updatedName);
        console.log(targetFile);

        let imgList = ['.png','.jpg','.jpeg'];

        if(!imgList.includes(extName)){
            fs.unlinkSync(targetFile.tempFilePath);
            return res.send("Invalid Image");
            //return res.status(422).send("Invalid Image");
        }

        if(targetFile.size > 1048576){
            fs.unlinkSync(targetFile.tempFilePath);
            return res.send("File is too Large");
            //return res.status(413).send("File is too Large");
        }

        let find_user = `SELECT * FROM users WHERE username = "${req.session.username}";`
        conn.query(find_user, (err, result) => {
            if (err) throw err;
            else{
                let previous_pic = result[0].profile_picture;
                let previous_pic_path = path.join(__dirname, 'public/profile_pics', previous_pic);

                if(previous_pic !== "default.jpg"){
                    fs.unlinkSync(previous_pic_path);
                }
                conn.query('UPDATE `users` SET profile_picture=? WHERE username = ?',[updatedName, req.session.username], (err, result) => {
                    if (err) throw err;
                })
            }
        })
        
        targetFile.mv(uploadDir, (err) => {
            if (err)
                return res.status(500).send(err);
            res.redirect("/users/edit/")
        });
    } else {
        res.redirect('/error')
    }
});


app.post('/users/remove_picture/', (req, res) => {
    
    if (req.session.username) {
        let find_user = `SELECT * FROM users WHERE username = "${req.session.username}";`
        conn.query(find_user, (err, result) => {
            if (err) throw err;
            else{
                let curr_pic = result[0].profile_picture;
                if(curr_pic !== "default.jpg"){
                    let curr_pic_path = path.join(__dirname, 'public/profile_pics', curr_pic);
                    fs.unlinkSync(curr_pic_path);
                    
                    conn.query('UPDATE `users` SET profile_picture="default.jpg" WHERE username = ?',[req.session.username], (err, result) => {
                        if (err) throw err;
                    })  
                }
                res.redirect("/users/edit/");
            }
        })
    } else {
        res.redirect('/error')
    }

});

app.get('/users/new_post/', (req, res) => {
    if (req.session.username){
        let find_user = `SELECT * FROM users WHERE username = "${req.session.username}";`
        conn.query(find_user, (err, result) => {
            if (err) throw err;
            else{
                //console.log(result);
                res.render('new_post',  {user:result[0]})
            }
        })
    }
    else    
        res.redirect('/error')

})

app.post('/users/new_post/', (req, res) => {
    if (req.session.username) {
        // let moment = req.timestamp
        let targetFile = req.files.file_input;
        let extName = path.extname(targetFile.name)
        let baseName = targetFile.name;
        let {description, price} = req.body
        // let pic_name_hashed = bcrypt.hashSync(moment + req.session.username, 10)
        let uploadDir = path.join(__dirname, `public/posts/${req.session.username}`)

        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir)
        
        uploadDir = path.join(uploadDir, targetFile.name)
        
        //console.log(`Price: ${price}\nDescription: ${description}`)

        let imgExtList = ['.png', '.jpg', '.jpeg', '.gif']
        if (!imgExtList.includes(extName)){
            fs.unlinkSync(targetFile.tempFilePath)
            return res.send('Invalid image format');
        }   

        targetFile.mv(uploadDir, (err) => {
            if (err)
                return res.send(err)
            conn.query(`SELECT id FROM users where username = "${req.session.username}";`, (err, resl)=> {
                if (err) throw err;
                //console.log(resl);
                let sql = `INSERT INTO posts(pic_name, profile_id, price, description) VALUES ("${baseName}", ${resl[0].id}, ${price}, "${description}");` 
                conn.query(sql, (err, result) => {
                    if (err) throw err;
                    res.redirect('/users/')
                })
            })
          
        })
        // res.redirect('/users/')

    } else 
        res.redirect('/error')
})


app.post('/users/like/:post_id', (req, res) => {
    if (req.session.username){
        const post_id = parseInt(req.params.post_id, 10);
        let prev_like;
        conn.query('SELECT likes FROM posts WHERE id = ?',[post_id] ,(err, result) => {
            if (err) throw err;
            else{
                prev_like = result[0].likes;
                let new_like = prev_like + 1;
                
                conn.query('UPDATE `posts` SET likes=? WHERE id = ?',
                [new_like, post_id] ,(err, result) => {
                    if (err) throw err;
                    else{
                        //console.log(result);
                        res.redirect('back');
                    }
                })
            }
        })
    }
    else    
        res.redirect('/error')
})



app.post('/users/buy/:post_id', (req, res) => {
    if (req.session.username){
        conn.query('SELECT * FROM posts WHERE id = ?',[req.params.post_id] ,(err, result) => {
            if (err) throw err;
            else{
                const product = JSON.parse(JSON.stringify(result))[0]
                req.session.basket.push(product);
                console.log(req.session.basket)
                
                res.redirect('back');
            }
        })
    }
    else    
        res.redirect('/error')

})


app.get('/users/basket/', (req, res) => {
    if (req.session.username){
        
        res.render('basket',  {basket:req.session.basket})
    }
    else    
        res.redirect('/error')
})


app.post('/users/basket/delete/:index', (req, res) => {
    if (req.session.username){
        req.session.basket.splice(req.params.index, 1);
        //console.log(req.session.basket)

        res.redirect('back');
    }
    else    
        res.redirect('/error')
})




app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`)
})

