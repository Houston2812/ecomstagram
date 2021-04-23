function buy(post_id) {
    console.log(post_id)
  fetch('http://localhost:3000/users/buy/'+post_id, {
      method: 'POST',
      
  })
      .then(responce => {
          console.log(responce)
          responce.json()
      })
      .then(data => {
          console.log(data)
          alert('Item is added to the basket')
      })
}
function like(post_id) {
    console.log(post_id)
  fetch('http://localhost:3000/users/like/'+post_id, {
      method: 'POST'
  })
      .then(responce => {
          console.log(responce)
          return responce.json()
      })
      .then(data => {
          console.log('Likes: ' + data['likes'])
          console.log(document.getElementById(post_id).innerHTML)
          document.getElementById(post_id).innerHTML = data['likes']
          document.getElementById('btn-'+post_id).innerHTML = 'Dislike'
          document.getElementById('btn-'+post_id).onclick = function(){dislike(post_id)} // `dislike(${post_id})`
          })
}
function dislike(post_id) {
    console.log(post_id)
    fetch('http://localhost:3000/users/dislike/ '+post_id, {
        method: 'POST'
    })
        .then(responce => {
            console.log(responce)
            return responce.json()
        })
      .then(data => {
          console.log(data)
          document.getElementById(post_id).innerHTML = data['likes']
          document.getElementById('btn-'+post_id).innerHTML = 'Like'
          document.getElementById('btn-'+post_id).onclick = function(){like(post_id)}//  `like(${post_id})`

      })
}
function like_list() {
    fetch('http://localhost:3000/users/is_liked', {
        method: 'POST'
    })
        .then(responce => {
            console.log(responce)
            return responce.json()
        })
      .then(data => {
          let arr = []
          for(var i in data) {
              // let element = document.getElementById()
              for (var j in data[i]){
                  var element = document.getElementById('btn-' + data[i][j]['post_id'])
                  element.innerHTML = 'Dislike'
                  element.onclick = function(){dislike(data[i][j]['post_id'])} //`dislike(${data[i][j]['post_id']})`
                  // console.log(element.innerHTML)
                  arr.push(element)
                  // console.log(data[i][j]['post_id'])
                  // console.log(i + ' ' + data[i])
              }
          }
          console.log(arr)
      })
}
function foo() {
    alert('Ready')
}