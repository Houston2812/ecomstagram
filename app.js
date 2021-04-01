const express = require('express')
const session = require('express-session')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const { query } = require('express')

const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

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

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : path.join(__dirname,'tmp'),
}));
// app.use(fileUpload());

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CHANGE_IT',
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
    console.log(username, passw)
    let sql = `select * from users where username="${username}";`
    conn.query(sql, (err, result) => {
        if (err) throw err;
        console.log(result);

        if (result.length > 0) {
            let compare = bcrypt.compareSync(passw, result[0].password)
            if (compare) {
                req.session.is_logged = true;
                req.session.username = result[0].username;
                console.log(username);
                res.redirect('/users/' + result[0].id)
            }
            else {
                req.session.is_logged = false;
                req.session.username = '';
                res.render('login', {is_logged: req.session.is_logged})
            }
        }
    })
})


app.get('/users/:user_id', (req, res) => {
    const user_id = req.params.user_id;

    let find_user = `SELECT * FROM users WHERE id = "${user_id}";`
    conn.query(find_user, (err, result) => {
        if (err) throw err;
        else{
            console.log(result);
            res.render('userProfile', {user:result[0]});
        }
    })

});


app.get('/users/edit/:user_id', (req, res) => {
    const user_id = req.params.user_id;

    let find_user = `SELECT * FROM users WHERE id = "${user_id}";`
    conn.query(find_user, (err, result) => {
        if (err) throw err;
        else{
            // console.log(result);
            res.render('userProfileEdit', {user:result[0]});
        }
    })

});

app.post('/users/edit/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const {username, firstname, lastname, profile_description, date_of_birth, email_add, mobile_number} = req.body;

    conn.query('UPDATE `users` SET username=?, firstname=?, lastname=?, profile_description=?, date_of_birth=?, email_add=?, mobile_number=? WHERE id = ?',
    [username, firstname, lastname, profile_description ,date_of_birth, email_add, mobile_number, user_id], (err, result) => {
        if (err) throw err;
        else{
            // console.log(result);
            res.redirect("/users/" + user_id)
        }
    })
});

app.post('/users/edit_picture/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    
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

    let find_user = `SELECT * FROM users WHERE id = "${user_id}";`
    conn.query(find_user, (err, result) => {
        if (err) throw err;
        else{
            let previous_pic = result[0].profile_picture;
            let previous_pic_path = path.join(__dirname, 'public/profile_pics', previous_pic);

            if(previous_pic !== "default.jpg"){
                fs.unlinkSync(previous_pic_path);
            }
            conn.query('UPDATE `users` SET profile_picture=? WHERE id = ?',[updatedName, user_id], (err, result) => {
                if (err) throw err;
            })
        }
    })
    
    targetFile.mv(uploadDir, (err) => {
        if (err)
            return res.status(500).send(err);
        res.redirect("/users/edit/" + user_id)
    });

  
});

app.post('/users/remove_picture/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    
    
    let find_user = `SELECT * FROM users WHERE id = "${user_id}";`
    conn.query(find_user, (err, result) => {
        if (err) throw err;
        else{
            let curr_pic = result[0].profile_picture;
            if(curr_pic !== "default.jpg"){
                let curr_pic_path = path.join(__dirname, 'public/profile_pics', curr_pic);
                fs.unlinkSync(curr_pic_path);
                
                conn.query('UPDATE `users` SET profile_picture="default.jpg" WHERE id = ?',[user_id], (err, result) => {
                    if (err) throw err;
                })  
            }
            res.redirect("/users/edit/" + user_id);
        }
    })
    

});


app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`)
})

