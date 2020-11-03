var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHTML = require('sanitize-html');
var mysql = require("mysql");
var msg = require ('dialog');
var rawdata ;
//RDS 접속 정보
var connection = mysql.createConnection({
    host: "nodejs-rds.cdaki73gryig.ap-northeast-2.rds.amazonaws.com",
    user: "admin",
    password: "password",
    database: "data"
});
connection.connect(function(err){
    if(err){
        throw err;
    } else{
        connection.query(`SELECT * FROM information`, function(err, rows, fields){
            rawdata = rows;
            console.log("정상적으로 DB에 연결 되었습니다.\n"+rows.length+" 개의 데이터가 존재 합니다.")
        });
    }
});


var app = http.createServer(function (request, response) {
    // _url : 현재 경로만 보이게
    // queryData : 각 항목 이름
    // pathname : 각 항목을 눌렀을 때 "/?id=JavaScript" 와 같이 쿼리 데이터 
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    // root directory로 들어갔을 때
    if (pathname === '/') {
        // 쿼리데이터가 없을 때(초기 화면)
        if (queryData.id === undefined) {
            var title = "Welcome";
            var description = "Hello, This is ddungdo's home";
            var list = template.Listrds(rawdata);
            var html = template.HTML(title, list, 
         `<h2>${title}</h2>${description}`,
            `<table id="empList" class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" data-upgraded=",MaterialDataTable">
                <tbody><tr id="yy" class="mdl-data-table__cell--non-numeric">
                <th><a href="/create">create</a></th>
                </tr></table>
         
                
                `);
            response.writeHead(200);
            response.end(html);
        // 쿼리 데이터가 있을 때 (각 항목을 누른 상황)
        } else {
            var filteredID = path.parse(queryData.id).base;
            // rds에서 데이터 받아오는 함수
            connection.query("SELECT * FROM information WHERE title="+`"${filteredID}"`, function(err, rows, fields){
                console.log(rows[0].title);
                var title = rows[0].title;
                var data = rows[0].description;
                var latitude = rows[0].latitude;
                var longtitude = rows[0].longtitude;
                var list = template.Listrds(rawdata);
                var html = template.HTML(title, list,
                    `<div id="tt"><h2 class="tt">${title}</h2>
               
                  <div class="grid__container">
                     <div class="form--login" id="ds">
                        <br>
                        <label class="fontawesome-user" for="name"> 위도&nbsp;</label>
                        <label id="st">${latitude}</label>
                        
                        <label class="fontawesome-user" for="name"> 경도&nbsp;</label>
                        <label id="st">${longtitude}</label>
                        <br><br>
                        <strong>${data}</strong>
                     </div>
                  </div>
               
               </div>
               
               <div class="grid">
                  <div id="map"></div>
               </div>
               
               
               
                    `,                        `
                    <table id="empList" class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" data-upgraded=",MaterialDataTable">
                <tbody><tr id="yy" class="mdl-data-table__cell--non-numeric">
                <th><a href="/create">create</a></th>
            <th><a href="/update?id=${title}">update</a> </th>
            <th><form action="/delete_process" method="post">
                        <input type="hidden" name="id" value="${title}">
                        <input type="submit" class="del" value="delete">
                    </form></th>
                </tr></table>
               
               
                    `);
                response.writeHead(200);
                response.end(html);
            });
        }
    // create 항목을 눌렀을 때
    } else if(pathname ==='/create'){
        var title = 'WEB - create';
        var list = template.Listrds(rawdata);
        var html = template.HTML(title, list, `
            <form action="/create_process" method="post" class="form form--login">
            <div class="grid__container">
               <div class="form__filed">
                  <label class="fontawesome-user" for="name"> 위치 이름&nbsp;</label>
                  <input class="form__inpit" type="text" name="title" placeholder="위치 이름">
               </div>
               <br>
               <div class="form__filed">
                  <label class="fontawesome-user" for="name"> 위도&nbsp;</label>
                  <input class="form__inpit" type="number"  step="0.000001" name="latitude" placeholder="위도" style="width:70px;height:15px;">
               </div><br>
               <div class="form__filed">
                  <label class="fontawesome-user" for="name"> 경도&nbsp;</label>
                  <input class="form__inpit" type="number"  step="0.000001" name="longtitude" placeholder="경도" style="width:70px;height:15px;">
               </div><br>
               <div class="form__filed">
                  <textarea name="description" placeholder="설명"></textarea>
               </div>
               <input type="submit">
            </div>
            </form>
            `, '');
        response.writeHead(200);
        response.end(html);

    // create 항목에서 제출을 클릭했을 때 302를 반환하고 파일을 생성
    } else if(pathname ==='/create_process'){
        var body = '';
        request.on('data', function(data){
            body = body + data;
        });
        request.on('end', function(){
            var post = qs.parse(body);
            console.log(post);
            connection.query(`INSERT INTO information VALUES("${post.title}", "${post.latitude}", "${post.longtitude}", "${post.description}")`, function(err, rows, fields){
                // 오류가 발생 할 경우 에러 메세지 표시
                if(err){
                    console.log(err.sqlMessage);
                    msg.err(err.sqlMessage);
                    response.writeHead(302, {Location: `/`});
                    response.end('success');
                }else{
                    connection.query(`SELECT * FROM information`, function(err, rows, fields){
                        rawdata = rows;
                        console.log("정상적으로 DB에 저장 되었습니다.\n"+rows.length+" 개의 데이터가 존재 합니다.");
                  
                    });
               response.writeHead(302, {Location: `/`});
                    response.end('success');
                }
            });
        });
    // 각 항목을 누른 후 update를 눌렀을 때 queryData.id 를 받아와서 해당 내용을 표출 및 update
    } else if(pathname ==='/update'){
        var filteredID = path.parse(queryData.id).base;
            // rds에서 데이터 받아오는 함수
            connection.query("SELECT * FROM information WHERE title="+`"${filteredID}"`, function(err, rows, fields){
                console.log(rows[0].title);
                var title = rows[0].title;
                var data = rows[0].description;
                var latitude = rows[0].latitude;
                var longtitude = rows[0].longtitude;
                var list = template.Listrds(rawdata);
                var html = template.HTML(title, list,
                    `
                    <form action="/update_process" method="post" class="form form--login">
                        <div class="grid__container">
                    <br><br>
                        <div class="form__filed"><input class="form__inpit" type="hidden" name="id" value="${title}"></div >
                        <div class="form__filed">
                            <label class="fontawesome-user" for="name"> 이름&nbsp;</label>
                            <input class="form__inpit" type="text" name="title" placeholder="title" value="${title}">
                        </div >
                        <div class="form__filed"><br><br>
                            <label class="fontawesome-user" for="name">위도&nbsp;</label>
                            <input class="form__inpit" type="number" step="0.000001"  name="latitude" placeholder="위도" value="${latitude}" style="height:20px" >
                        </div >
                        <div class="form__filed"><br>
                            <label class="fontawesome-user" for="name"> 경도&nbsp;</label>
                            <input class="form__inpit" type="number" step="0.000001"  name="longtitude" placeholder="경도" value="${longtitude}"style="height:20px">
                        </div >
                            <div class="form__filed"><br><br>
                            <label class="fontawesome-user" for="name"> 내용&nbsp;</label></br>
                            <textarea class="div" name="description" placeholder="설명">${data}</textarea>
                        </div>
                        <button onclick id="save" class="mdl-button mdl-js-button mdl-js-ripple-effect">전송하기</button>
                    </div>
                    </form>
                    `,
                    `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`);
                response.writeHead(200);
                response.end(html);
            });
    // update_process 부분
    }else if(pathname ==="/update_process"){
        // 데이터 나누어서 받고 (데이터가 너무 클 경우에는 exception 처리 해주는 함수 추가 필요)
        var body = '';
        request.on('data', function(data){
            body = body + data;
        });
        // 데이터가 모두 
        request.on('end', function(){
            var post = qs.parse(body);
            console.log(post);
            // 현재 적혀있는 title, latitude, longtitude, description을 저장 => 원래 있던 title로 구분 (primary key 여서 가능)
            connection.query(`UPDATE information SET title = "${post.title}", latitude = "${post.latitude}", longtitude = "${post.longtitude}", description = "${post.description}" WHERE title = "${post.id}"`, function(err, rows, fields){
                // error 
                if(err){
                    console.log(err.sqlMessage);
                    msg.err(err.sqlMessage);
                    response.writeHead(302, {Location: `/`});
                    response.end('success');
                }else{
                    connection.query(`SELECT * FROM information`, function(err, rows, fields){
                        rawdata = rows;
                        console.log("정상적으로 DB에 저장 되었습니다.\n"+rows.length+" 개의 데이터가 존재 합니다.");
                    });
                    response.writeHead(302, {Location: `/?id=${qs.escape(post.title)}`});
                    response.end('success');
                }
            });
        });
    } 
    // 삭제 기능 
    else if(pathname ==="/delete_process"){
        var body = '';
        request.on('data', function(data){
            body = body + data;
        });
        request.on('end', function(){
            // 넘긴 값을 parse로 받아주는 형식
            var post = qs.parse(body);
            var id = post.id;
            var filteredID = path.parse(id).base;
            connection.query(`DELETE from information where title = "${filteredID}"`, function(err, rows, fields){
                if (err){
                    console.log(err.sqlMessage);
                    msg.err(err.sqlMessage);
                    response.writeHead(302, {Location: `/`});
                    response.end('success');
                }else{
                    connection.query(`SELECT * FROM information`, function(err, rows, fields){
                        rawdata = rows;
                        console.log("정상적으로 DB에서 삭제 되었습니다.\n"+rows.length+" 개의 데이터가 존재 합니다.");
                    });
                    response.writeHead(302, {Location: `/`});
                    response.end('success');
                }
                
            });
        });
    }
    else {
        response.writeHead(404);
        response.end('Not Found');
    }

});
app.listen(3000);