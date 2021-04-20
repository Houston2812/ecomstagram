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
var flash = require('connect-flash')
var { body, check, validationResult, custom} =  require('express-validator')
var cookieParser = require('cookie-parser')
var sign = require('jwt-encode')
const nodemailer = require('nodemailer')
const config = require('./config')
const { Z_FILTERED } = require('zlib')

var app = express()
var port = 3000
var hour = 3600000
const user = config.user
const pass = config.pass 

app.set('view engine', 'ejs')
app.use('/public',express.static('public'));


app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(time.init)
app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : path.join(__dirname,'tmp'),
}));
// app.use(expressValidator())
// app.use(fileUpload());

app.use(cookieParser(config.sessionSecret))
app.use(session({
    secret: config.sessionSecret,
    resave: false, 
    saveUninitialized: false,
    cookie: { maxAge: 100*hour }
}))
app.use(flash())

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: config.db_pass,
    database: 'ecomstagram'
})

const transport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: user,
        pass: pass,
    }
})

var sendConfirmationEmail = (name, email, confirmationCode) => {
    console.log(name, email, confirmationCode )
    transport.sendMail({
        from: user,
        to: email,
        subject: 'Please confirm your account',
        html: `
            <h1> Email Confirmation </h1>
            <h2> Hello ${name} </h2>
            <p> Thank you for creating an account on E-comstagram. Please activate your account by clicking at following link</p>
            <a href=http://localhost:${port}/confirm/${confirmationCode}> Click here </a>
            `
    }).catch(err => console.log(err));
}

app.get(['/', '/home'], (req, res) => {
    req.session.cookie.expires = new Date(Date.now() + hour)
    res.render('welcome', {username: req.session.username})
})

app.get('/customer_registration', (req, res) => {
    res.render('customer_registration')
})

app.get('/business_registration', (req, res) => {
    res.render('business_registration')
})

app.get('/login', (req, res)=> {
    if (req.session.isActivated == 'false') {
        req.flash('success', 'User registered successfully! Please activate your account through confirmation mail.')
        res.locals.message = req.flash()
        req.session.isActivated = 'true';
    }
    res.render('login',  {is_logged: req.session.is_logged})
})

// password should contain at least one lowercase letter, one uppercase letter,
// one numeric digit and one special character and be 7-15 characters long 
app.post(
    '/customer_registration', 
    check('username')
        .matches(/^[A-Za-z]\w{7,14}$/)
        .withMessage('Username must be at least 7 characters long and start with letter.'),
    check('email_add')
        .isEmail().withMessage('Email should be entered to this field')
        .custom((value, {req}) => {
            return new Promise((resolve, reject) => {
                let email_query = `select * from users where email_add = "${req.body.email_add}";`
                conn.query(email_query, (err, result) => {
                    if (err) throw err
                    if (result.length > 0) [
                        reject(new Error('Email already in use'))
                    ]

                    resolve(true)
                })
            })
        }),
    check('passw')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{7,15}$/)
        .withMessage('Password must be at least 7 characters long and must contain digits, symbols, uppercase and lowercase letters.'),
    body('passw_rep').custom((value, {req}) => {
        console.log(req.body.passw, value)
        if (value !== req.body.passw) {
            throw new Error('Password confirmation does not match password')
        }
        return true
    }),
    check('mobile_number')
        .matches(/^\+\(?([0-9]{3})\)?([0-9]{6,14})$/)
        .withMessage('Mobile number must satisfy international phone number format.'),
    (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            var error_msg = '';
            errors.array().forEach(err => {
                error_msg += err.msg + '<br>'
            })
            req.flash('error', error_msg)
            res.locals.message = req.flash()
            res.render('customer_registration')
        } else {
            const {username, passw, passw_rep, firstname, lastname, date_of_birth, email_add, mobile_number} = req.body;    
            const token = sign({email: email_add}, config.secret)

            bcrypt.hash(passw, 10, (err, encPass) => {
                if (err)
                    throw err;
                let sql = `INSERT INTO users(firstname, lastname, date_of_birth, username, password, email_add, mobile_number, confirmationCode) values ("${firstname}", "${lastname}", "${date_of_birth}", "${username}", "${encPass}", "${email_add}", "${mobile_number}", "${token}");`
                conn.query(sql, (err1, result) => {
                    if (err1) throw(err1);
                    req.session.isActivated = "false";
                    sendConfirmationEmail(username, email_add, token)
                    res.redirect('/login')
                })
            })
        }
})

app.post(
    '/business_registration', 
    check('username')
        .matches(/^[A-Za-z]\w{7,14}$/)
        .withMessage('Username must be at least 7 characters long and start with letter.'),
    check('email_add')
        .isEmail().withMessage('Email should be entered to this field')
        .custom((value, { req }) => {
            return new Promise((resolve, reject) => {
                let email_query = `select * from users where email_add = "${req.body.email_add}";`
                conn.query(email_query, (err, result) => {
                    if (err) throw err
                    if (result.length > 0) [
                        reject(new Error('Email already in use'))
                    ]

                    resolve(true)
                })
            })
        }),
    check('passw')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{7,15}$/)
        .withMessage('Password must be at least 7 characters long and must contain digits, symbols, uppercase and lowercase letters.'),
    body('passw_rep').custom((value, { req }) => {
        console.log(req.body.passw, value)
        if (value !== req.body.passw) {
            throw new Error('Password confirmation does not match password')
        }
        return true
    }),
    check('mobile_number')
        .matches(/^\+\(?([0-9]{3})\)?([0-9]{6,14})$/)
        .withMessage('Mobile number must satisfy international phone number format.'),
    (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            var error_msg = '';
            errors.array().forEach(err => {
                error_msg += err.msg + '<br>'
            })
            req.flash('error', error_msg)
            res.locals.message = req.flash()
            res.render('business_registration')
        } else {
            const { username, passw, passw_rep, firstname, lastname, date_of_birth, email_add, mobile_number } = req.body;
            const token = sign({email: email_add}, config.secret)

            bcrypt.hash(passw, 10, (err, encPass) => {
                if (err)
                    throw err;
                let sql = `INSERT INTO users(firstname, lastname, date_of_birth, username, password, specialization, email_add, mobile_number, confirmationCode) values ("${firstname}", "${lastname}", "${date_of_birth}", "${username}", "${encPass}", "business", "${email_add}",  "${mobile_number}", "${token}");`
                conn.query(sql, (err1, result) => {
                    if (err1) throw (err1);
                    req.session.isActivated = "false";
                    sendConfirmationEmail(username, email_add, token)
                    res.redirect('/login')
                })
            })
        }
})

app.get('/confirm/:confirmationCode', (req, res) => {
    console.log(req.params.confirmationCode)
    let sql = `select * from users where confirmationCode = "${req.params.confirmationCode}";`
    conn.query(sql, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {    
            let update_sql = `update users set status = 1 where confirmationCode = "${req.params.confirmationCode}";`
            conn.query(update_sql, (err2, result2) => {
                if (err2) throw err2;
                res.locals.message = ''
                if (req.session.username){
                    res.redirect('/users')
                } else {
                    res.redirect('/login')
                }
            })
        }
        else {
            res.redirect('/error')
        }
    })
})

app.post('/login', (req, res) => {
    const {username, passw}  = req.body;
    let sql = `select * from users where username="${username}";`
    conn.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);

        if (result.length > 0) {
            if (result[0].status != 1) {
                req.flash('error', 'Pending account. Please verify your email');
                res.locals.message = req.flash()
                res.render('login')
            } else {
                let compare = bcrypt.compareSync(passw, result[0].password)
                if (compare) {
                    req.session.username = result[0].username;
                    req.session.basket = [];
                    console.log(username);
                    // res.redirect('/users/' + result[0].id)
                    res.redirect('/users/')
    
                }
                else {
                    req.flash('error', 'Wrong credentaials!');
                    res.locals.message = req.flash()
                    req.session.username = '';
                    res.render('login')
                }
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
        req.session.cookie.expires = new Date(Date.now() + hour)
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
        req.session.cookie.expires = new Date(Date.now() + hour)
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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)
    
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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)

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
        req.session.cookie.expires = new Date(Date.now() + hour)
        
        res.render('basket',  {basket:req.session.basket})
    }
    else    
        res.redirect('/error')
})


app.post('/users/basket/delete/:index', (req, res) => {
    if (req.session.username){
        req.session.cookie.expires = new Date(Date.now() + hour)

        req.session.basket.splice(req.params.index, 1);
        //console.log(req.session.basket)

        res.redirect('back');
    }
    else    
        res.redirect('/error')
})

app.get('/feed', (req, res) => {
    if (req.session.username){
        req.session.cookie.expires = new Date(Date.now() + hour)
        req.session.cookie.expires = new Date(Date.now() + hour)

        let sql = `SELECT posts.*, users.username, users.profile_picture FROM posts, users WHERE users.id = posts.profile_id AND users.username != "${req.session.username}";`

        conn.query(sql, (err, result) => {
            if (err) throw err;
            if (result.length > 0){
                console.log(result);
                res.render('feed', {username: req.session.username, posts: result })
            }
        })



        // res.render('feed', {username: req.session.username})
    } else {
        res.redirect('/error')
    }
})



app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`)
})

