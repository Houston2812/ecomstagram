const express = require('express')
const session = require('express-session')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const { query } = require('express')

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

var conn = mysql.createConnection({
    host: 'CHANGE_IT',
    user: 'CHANGE_IT',
    password: 'CHANGE_IT',
    database: 'CHANGE_IT'
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
                res.redirect('/')
            }
            else {
                req.session.is_logged = false;
                req.session.username = '';
                res.render('/login', {is_logged: req.session.is_logged})
            }
        }
    })
})
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`)
})

