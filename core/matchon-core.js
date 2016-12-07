/**
 * MatchOn JavaScript API
 * 画笔(上海)有限公司
 * @version 1.0.0
 * @license MIT
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(["MoEventEmitter"], factory);
    } else if (typeof module === "object" && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("MoEventEmitter"));
    } else {
        // Browser globals (root is window)
        root.MatchOn = factory(root.MoEventEmitter);
    }
}(this, function (MoEventEmitter) {

    /**
     * MatchOn JavaScript API
     */

    "use strict";

    var lastRequest, lastFeedBack;
    var retryAfter = 1000;

    /**
     *<p> MatchOn构造函数是MatchOn API的唯一对外暴露的对象，通过原型继承MoEventEmitter，兼容node.js EventEmitter的事件管理对象，在浏览器中实现事件驱动的编程．</p>
     * <p>使用MatchOn API时，通过new MatchOn构造函数构造MatchOn对象，然后调用MatchOn对象的各个函数．</p>
     * <p>MatchonOn API所有的函数调用，立即返回Int值，代表是否通过合法性检查,提交到后端. 后端处理结果,通过MatchOn对象的事件消息, 由订阅该事件的函数处理．</p>
     *   <p>当返回值为-1时，代表传递的参数校验未通过，未提交</p>
     *   <p>当返回值为 0时，代表参数校验通过，成功提交</p>
     *   <p>对于某系函数,大于1时有特殊含义,见每个函数的具体描述 </p>
     * <p>每个API的函数名，对应一个同名的操作命令．对每个操作命令，例如abcFunction，根据处理结果，MatchOn对象会发出三种不同的事件：</p>
     * <ul>
     *  <li> "abcFunctionSucceeded",代表处理成功；</li>
     *  <li>  "abcFunctionFailed", 代表处理异常；</li>
     * </ul>
     * <p>API调用者需要在调用前，通过matchon.on("eventName", function eventHandler(e) { 您的事件处理代码 })，注册该事件的处理函数．</p>
     * <p> MatchOn的事件处理的模式和API，与Nodejs的EventEmitter兼容，关于如何使用该API, <a href="https://nodejs.org/dist/latest-v6.x/docs/api/events.html">请见Nodejs官方文档</a></p>
     * @param {Object} options 构造MatchOn对象的参数,包含如下属性：
     * @param {String} options.matchingServer 匹配服务器的域名或IP地址，如果不指定，使用默认值
     * @param {String} options.messagingServer 消息服务器的域名或IP地址，如果不指定，使用默认值
     * @param {String} options.gameID 游戏的编号，用户在matchon.cn注册开发者账号后，创建新游戏时获得gameID
     * @param {String} options.secrete 游戏安全秘钥，用户在matchon.cn注册开发账号后，创建新游戏时获得游戏安全秘钥
     * @param {Int} options.timeout 初始化和连接后台的超时事件值，单位为秒
     * @return {Object} MatchOn对象
     * @throws 如果参数错误，将拋出Error("New MatchOn Parameter Error")
     * @module MatchOn
     * @namespace MatchOn
     * @class MatchOn
     *
     */

    function MatchOn (options) {

        this.options = options || {};

        if( !this.options.gameID ||
            !this.options.secrete)
            throw new Error("Parameter Error");


        this.options.matchingServer = this.options.matchingServer || "https://mch.matchon.cn:9191";
        this.options.messagingServer = this.options.messagingServer || "https://msg.matchon.cn:9292";
        this.options.timeout = this.options.timeout || 60;

        if( typeof this.options.gameID !== "string" ||
            typeof this.options.secrete !== "string" ||
            typeof this.options.timeout !== "number" ||
            this.options.timeout < 1)
            throw new Error("New MatchOn Parameter Error");

        this.test = "MatchOn constructed";

        this.matchingServers = [this.options.matchingServer];
        this.currentMatchingServer = this.options.matchingServer;
        this.messagingServers = [this.options.messagingServer];
        this.currentMessagingServer = this.options.messagingServer;
        this.moRequest = moRequest.bind(this);
        this.sendString = sendString.bind(this);

    };

    MatchOn.prototype = Object.create(MoEventEmitter.prototype);

    MatchOn.prototype.constructor = MatchOn;

    /**
     * 内部函数，产生一个随机整数
     * @param {Int} min, 最小值，包含在内
     * @param {Int} max, 最大值，不包含在内
     * @return {Int}　生成的随机数
     */

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }    

    /**
     * 内部函数，在提交请求到后端，收到返回redirect指令后，redirect到新的服务器提交请求;
     * 在请求连接或者服务器错误时，尝试其他服务器；
     * @param {String} cmdType: 命令类型
     * @param {String} method: 请求方法
     * @param {String} uriTail: uri后部
     * @param {String} body: Json格式字符串，请求体
     * @param {Object} para: 传递给调用moRequest的函数的参数对象，在处理结果事件对象中原值返回
     * @param {Object} feedback: 传递给调用moReqeust的函数的调用标志对象，在处理结果事件对象中原值返回．
     *                       由开发者自行设置．开发者在调用MatchOn API时，可以在本对象中设置对处理结果进行回调处理的函数
     * @return {Int}   返回值：　整数，-1代表参数错误，０代表成功提交
     */

    function moRequest(cmdType, method, uriTail, body, para, feedback) {
        if(     !cmdType || !(typeof cmdType === "string") ||
                !method || !(typeof method === "string") ||
                !uriTail || !(typeof uriTail === "string"))

            return -1;

        var startTime = Date.now();

        var that = this;

        var uriHead = that.currentMatchingServer;

        var request = new XMLHttpRequest();

        var retryHandler = undefined;
        request.open(method, uriHead + uriTail, true);
        request.setRequestHeader("Content-type", "text/plain");
        request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
        request.setRequestHeader("Cache-Control", "no-cache");
        request.timeout = 1000;

        request.onreadystatechange = function (e) {
            if (request.readyState === 4) {

                switch ( request.status ) {
                case 308: //后端服务器已切换，尝试连接另一服务器
                    clearTimeout(retryHandler);

                    uriHead = that.currentMatchingServer = JSON.parse(request.responseText).server;

                    if( Date.now() - startTime > that.options.timeout * 1000 ) {

                        that.emit(cmdType + "Error", {
                            code: -1,
                            para: para,
                            feedback: feedback });

                    } else {

                        retryHandler = window.setTimeout(function() {
                            request.open(method, uriHead +  uriTail);
                            request.setRequestHeader("Content-type", "text/plain");
                            request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
                            request.setRequestHeader("Cache-Control", "no-cache");
                            request.timeout = 1000;
                            request.send(body); }, retryAfter);
                        
                    }
                    break;

                case 202: //后端已接受请求，等待０.5　秒后再次提交

                    window.clearTimeout(retryHandler);
                    retryHandler = window.setTimeout(function() {
                        request.open(method, uriHead + uriTail);

                        request.setRequestHeader("Content-type", "text/plain");
                        request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
                        request.setRequestHeader("Cache-Control", "no-cache");
                        request.timeout = 1000;

                        request.send(body); }, retryAfter);

                    break;

                case 200: // Succeeded

                    if( cmdType === "init") { //这是初始化命令，初始化服务器列表

                        var servers = JSON.parse(request.responseText);

                        that.matchingServers = servers.matchingServers;

                        that.currentMatchingServer = that.matchingServers[getRandomInt(0,that.matchingServers.length)];

                        that.messagingServers = servers.messagingServers;

                        that.currentMessagingServer = that.messagingServers[getRandomInt(0,that.messagingServers.length)];

                        that.emit(cmdType + "Succeeded");

                    } else {
                        if( !request.responseText || request.responseText.trim() == "") 
                            that.emit(cmdType + "Succeeded", {
                                para: para,
                                feedback: feedback} );
                        else 
                            that.emit(cmdType + "Succeeded", {
                                para: para,
                                feedback: feedback,
                                data: JSON.parse(request.responseText) });

                    }

                    break;

                case 0: //提交请求或者服务错误，尝试另一服务器

                    that.currentMatchingServer = that.matchingServers[getRandomInt(0, that.matchingServers.length)];
                    uriHead = that.currentMatchingServer;

                    window.clearTimeout(retryHandler);

                    if( Date.now() - startTime > that.options.timeout * 1000 ) 
                        that.emit(cmdType + "Error", {
                            code: -1, //Timeout caused by network or other system errors
                            para: para,
                            feedback: feedback });
                    else {

                        retryHandler = window.setTimeout( function() {
                            request.open(method, uriHead + uriTail);
                            request.setRequestHeader("Content-type", "text/plain");
                            request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
                            request.setRequestHeader("Cache-Control", "no-cache");
                            request.timeout = 1000;

                            request.send(body); }, retryAfter );
                    }
                    break;
                default: 

                    window.clearTimeout(retryHandler);

                    that.emit(cmdType + "Error", {
                        code: request.status,
                        para: para,
                        feedback: feedback});
                    break;

                }
            }
        };


        request.onerror = function (e) {

            that.currentMatchingServer = that.matchingServers[getRandomInt(0, that.matchingServers.length)];
            uriHead = that.currentMatchingServer;

            window.clearTimeout(retryHandler);

            if( Date.now() - startTime > that.options.timeout * 1000 ) 
                that.emit(cmdType + "Error", {
                    code: -1, //Network or other system errors
                    para: para,
                    feedback: feedback });
            else {

                retryHandler = window.setTimeout( function() {
                    request.open(method, uriHead + uriTail);
                    request.setRequestHeader("Content-type", "text/plain");
                    request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
                    request.setRequestHeader("Cache-Control", "no-cache");
                    request.timeout = 1000;

                    request.send(body); }, retryAfter );
            }
        };

        request.ontimeout = function (e) {

            window.clearTimeout(retryHandler);

            that.currentMatchingServer = that.matchingServers[getRandomInt(0, that.matchingServers.length)];
            uriHead = that.currentMatchingServer;
            if( Date.now() - startTime > that.options.timeout * 1000 ) 
                that.emit(cmdType + "Error", {
                    code: -1,
                    para: para,
                    feedback: feedback });
            else {
                retryHandler = window.setTimeout( function() {
                    request.open(method, uriHead + uriTail);
                    request.setRequestHeader("Content-type", "text/plain");
                    request.setRequestHeader("If-Modified-Since", "Thu, 1 Jan 1970 00:00:00 GMT");
                    request.setRequestHeader("Cache-Control", "no-cache");
                    request.timeout = 1000;
                    request.send(body);}, retryAfter);
            }
        };

        request.send(body);

        return 0;

    }

    /**
     * @event MatchOn#initSucceeded
     * @desc 初始化成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * 
     */

    /**
     * @event MatchOn#initError
     * @desc 初始化错误
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     *
     */

    /** 
     * 初始化API. 在构造MatchOn对象后,调用任何API函数前,需要执行此函数,完成初始化
     * @param {Object} feedback: 随着处理结果事件回传的标志对象
     * @return {int} 
     *   <ul> 
     *     <li> 0 - 初始化请求成功提交</li>
     *     <li> -1 - 初始化请求提交失败</li>
     *   </ul>
     * @memberof MatchOn
     * @emits MatchOn#initSucceeded
     * @emits MatchOn#initError
     */


    MatchOn.prototype.init = function (feedback) {
        
        var uri = "/servers/" + this.options.gameID + "/" + this.options.secrete;
        return(this.moRequest("init","GET", uri, undefined, undefined, feedback));

    };


    /**
     * @typedef {Object} matchMember
     * @property {string} gameID 本游戏的ID
     * @property {string} playerID 玩家的ID
     * @property {string} requestID 玩家的原始匹配请求ID
     * @property {string} timeStamp 匹配事件,UTC时间1970年0点0分0秒以来以微秒(1/1000)计算的事件
     * @property {string} para 匹配参数,前端设置
     */

    /**
     * @event MatchOn#newMatchSucceeded
     * @desc 新匹配成功
     * @type {Object}
     * @property {Object} data 匹配结果
     * @property {string} data.matchID 后端生成的对战编号
     * @property {Array<matchMember>} data.activePlayers 对战活动玩家
     * @property {Array<matchMember>} data.inActivePlayers 对战非活动玩家
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#newMatchError
     * @desc 新匹配失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 提交新匹配请求
     * @param {Object} para 匹配请求，如下数据格式：
     * @param {string} para.requestID 请求编号，在一个游戏内必须唯一
     * @param {string} para.playerID 游戏玩家编号，在一个游戏内必须唯一
     * @param {string} para.algo 游戏算法编号
     * <ul>
     *  <li> ０：时间顺序匹配 </li>
     *  <li> １：级别顺序匹配 </li>
     *  <li> ２：级别错位匹配 </li>
     *  <li> ９9：指定匹配 </li>
     * </ul>
     * @param {string} para.para 游戏参数，算法为0和９９时无意义，算法为１和２时，设为数字格式的字符串，代表游戏玩家经验，等级或战斗力等参数
     * @param {Object} feedback: 随着处理结果事件回传的标志对象
     * @return {int} 是否成功提交, 0 - 成功提交, -1 - 数据错误
     * @memberof MatchOn
     * @emits MatchOn#newMatchSucceeded
     * @emits MatchOn#newMatchError
     */

    MatchOn.prototype.newMatch = function(para, feedback) {

        if( !para || 
            !para.requestID || 
            !para.playerID ||
            !para.algo )
            return -1;

        if( para.algo !== "0" &&
            para.algo !== "1" &&
            para.algo !== "2" &&
            para.algo !== "99")
            return -1;

        if((para.algo === "1" ||
           para.algo === "2") &&
           !para.para)
            return -1;

        if( para.algo === "1" ||
            para.algo === "2") {
            var paraN = Number(para.para);
            if( isNaN(paraN) )
                return -1;
        }

        var body = JSON.stringify(para);

        this.moRequest("newMatch","POST", "/match/" + this.options.gameID + "/" + this.options.secrete, body, para, feedback);

        return 0;
    };

    /**
     * @event MatchOn#openSocketSucceeded
     * @desc 建立Socket连接成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#openSocketError
     * @desc 建立Socket连接成功
     * @type {Object}
     * @property {Object} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#socketClosed
     * @desc Socket连接断开
     * @type {Object}
     * @property {Object} code Socket断开状态码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * <p> 建立Socket连接: </p>
     * <p> MatchOn支持两种建立连接的方式:</p>
     * <ul> 
     *   <li> 玩家模式: 以玩家身份建立连接, 将接收所有游戏消息,发送的消息也会被发送到其他玩家和订阅者 </li>
     *   <li> 订阅模式: 以订阅者身份建立连接,将会接收所有游戏消息, 发送的消息将作为心跳消息,不发给其他游戏玩家 </li>
     * </ul>
     * <p> 无论以哪种模式连接, 玩家需要不定时发送心跳消息, 以保存连接 </p>
     * @param {Object} para 建立socket参数
     * @param {string} para.playerID 游戏玩家编号
     * @param {string} para.matchID 对战编号
     * @param {string} para.connectionType 连接类型
     * <ul>
     *  <li> p: 玩家连接, 接收消息,发送的消息被发送到其他玩家 </li>
     *  <li> s: 订阅连接, 接收消息,发送的消息作为心跳消息, 不发送给其他玩家</li>
     * </ul>
     * @param {Object} feedback 建立Socket连接相应事件中返回，由用户自行设置
     * @return {int} 请求提交状态
     *   <ul> 
     *     <li> -1 参数错误 </li>
     *     <li> 0 提交建立Socket连接请求 </li>
     *     <li> 1 当前Socket仍在连接状态 </li>
     *   </ul>
     * @emits MatchOn#openSocketSucceeded
     * @emits MatchOn#openSocketError
     * @emits MatchOn#socketClosed
     * @memberof MatchOn
     */

    MatchOn.prototype.openSocket = function(para, feedback) {
        if( !para ||
            !para.playerID ||
            !para.matchID )

            return -1;
        
        var that = this;

        var retryHandler = undefined;
        var connectionType = para.connectionType || "/p";
        
        if( that.currentSocket && that.currentSocket.readyState === 1)
            return 1;

        lastRequest = para;
        lastFeedBack = feedback;

        var startTime = Date.now();

        var request = new XMLHttpRequest();
        
        var uri = that.currentMessagingServer + "/whichserver/" + that.options.gameID + "/" + that.options.secrete;

        request.open("GET",uri,true);
        request.timeout = that.options.timeout * 1000;
        request.onload = function (e) {

            if (request.readyState === 4) {
                if (request.status === 200 || request.status === 308) {

                    window.clearTimeout(retryHandler);

                    that.currentMessagingServer = JSON.parse(request.responseText).server;

                    var connectionString = "wss://" + that.currentMessagingServer.trim().slice(8) + "/websocket/" + that.options.gameID + "/" + para.playerID + "/" + para.matchID + "/" + that.options.secrete + connectionType;

                    var ws = new WebSocket(connectionString);
                    ws.onopen = function (e) {

                        that.currentSocket = ws;

                        that.emit("openSocketSucceeded", {
                            para: para, 
                            feedback:feedback});
                    };
                    
                    ws.onerror = function(e) {


                        if( Date.now() - startTime >  that.options.timeout * 1000)
                            that.emit("openSocketError", {
                                para: para,
                                feedback: feedback});
                        else {
                            retryHandler = window.setTimeout( function() {
                                that.currentMessagingServer = that.messagingServers[getRandomInt(0,that.messagingServers.length)];
                                uri = that.currentMessagingServer + "/whichserver/" + that.options.gameID + "/" + that.options.secrete;
                                request.open("GET",uri,true);
                                request.send(null); }, retryAfter );
                        }
                            
                    };

                    ws.onclose = function(e) {

                        that.emit("socketClosed", {
                            code: e.code,
                            para: para,
                            feedback: feedback});

                    };

                    ws.onmessage = function(e) {

                        that.emit("message", {
                            para: para, 
                            feedback: feedback, 
                            message: JSON.parse(e.data)
                        });

                    };


                } else {

                    window.clearTimeout(retryHandler);

                    if( Date.now() - startTime >  that.options.timeout * 1000)
                        that.emit("openSocketError", {
                            code: -1,
                            para: para, 
                            feedback: feedback
                        });
                    else {
                        retryHandler = window.setTimeout( function () {
                            that.currentMessagingServer = that.messagingServers[getRandomInt(0,that.messagingServers.length)];
                            uri = that.currentMessagingServer + "/whichserver/" + that.options.gameID + "/" + that.options.secrete;
                            request.open("GET",uri,true);
                            request.send(null); }, retryAfter );
                    }

                }
            }
        };

        request.onerror = function (e) {


            window.clearTimeout(retryHandler);

            if( Date.now() - startTime >  that.options.timeout * 1000)

                that.emit("openSocketError", {
                    code: -1,
                    para: para,
                    feedback: feedback
                });

            else {

                retryHandler = window.setTimeout( function () {
                    that.currentMessagingServer = that.messagingServers[getRandomInt(0,that.messagingServers.length)];
                    uri = that.currentMessagingServer + "/whichserver/" + that.options.gameID + "/" + that.options.secrete;
                    request.open("GET",uri,true);

                    request.send(null); }, retryAfter );

            }

        };

        request.ontimeout = function (e) {


            window.clearTimeout(retryHandler);

            if( Date.now() - startTime >  that.options.timeout * 1000)

                that.emit("openSocketError", {
                    code: -1,
                    para: para, 
                    feedback: feedback});

            else {

                //Try another server.
                retryHandler = window.setTimeout( function() {
                    that.currentMessagingServer = that.messagingServers[getRandomInt(0,that.messagingServers.length)];
                    uri = that.currentMessagingServer + "/whichserver/" + that.options.gameID + "/" + that.options.secrete;
                    request.open("GET",uri,true);
                    request.send(null); }, retryAfter );

            }
        };

        request.send(null);

        return 0;
    };


    /**
     * 发送消息
     * @param {string} type 消息类型，２个字节,用户自定义消息.对每个类型的消息,后端保存收到的最后一条
     * @param {Object} content 消息内容，任意对象，将会被转换为JSON字符串发送
     * @return {int} 消息发送状态
     *               -2 : Socket不存在
     *               -1 : 参数错误
     *               1 : 正常状态,提交发送
     *               0 : 正在建立连接
     *               2 : 正在关闭
     *               3 : 已关闭
     */


    MatchOn.prototype.sendMessage = function (type, content) {

        if(!type ||
           !content ||
           (typeof type) !== "string" ||
           type.length != 2)
            return -1;

        var msg = JSON.stringify({
            type: type,
            content: content});

        return this.sendString(msg.trim());
        
    };



    /**
     * 内部函数, 发送文字消息
     * @param {string} message: 等待发送的消息
     * @return {int} 消息发送状态
     *               -2 : Socket不存在
     *               -1 : 参数错误
     *               1 : 正常状态,提交发送
     *               0 : 正在建立连接
     *               2 : 正在关闭
     *               3 : 已关闭
     */

    function sendString (message) {

        if(!message ||
           !(typeof message === "string"))
            return -1;

        if(!this.currentSocket)
            return -1;

        if(this.currentSocket.readyState != 1)
            return this.currentSocket.readyState;

        this.currentSocket.send(message);

        return 1;
    };

    /**
     * 获得Socket的当前状态
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 未创建Socket </li>
     *  <li> 0 : 连接尚未建立 </li>
     *  <li> 1 : 连接已建立,状态正常 </li>
     *  <li> 2 : 连接正在关闭中 </li>
     *  <li> 3 : 连接已关闭 </li>
     * </ul>
     * @memberof MatchOn
     */

    MatchOn.prototype.getSocketState = function () {

        if(!this.currentSocket)
            return -1;

        return this.currentSocket.readyState;

    };

    /**
     * 断开Socket连接
     * @return {int} 断开连接的处理结果
     * <ul>
     *  <li> -1 : 未创建Socket </li>
     *  <li> 0 : 断开连接 </li>
     * </ul>
     * @memberof MatchOn
     */

    MatchOn.prototype.disconnect = function () {

        if(!this.currentSocket)
            return -1;

        this.currentSocket.close();

        return 0;

    };


    /**
     * 使用上一个连接请求，重新建立连接
     * @param {Object} feedback: 回调对象,在openSocketSucceeded和openSocketError事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>0 : 提交建立Socket连接 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#openSocketSucceeded
     * @emits MatchOn#openSocketError
     */

    MatchOn.prototype.reconnect = function (feedback) {
        return this.openSocket(lastRequest, feedback || lastFeedBack);
    };



    /**
     * @event MatchOn#cancelMatchingSucceeded
     * @desc 取消匹配成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#cancelMatchingError
     * @desc 取消匹配错误
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * 撤销匹配请求．　如果原请求已匹配成功，则无法撤销
     * @param {Object} para 撤销匹配请求参数对象
     * @param {string} para.cancelID 本次撤销请求的编号
     * @param {string} para.playerID 玩家编号
     * @param {string} para.algo 原匹配请求的算法编号, 必须填写,否则无法提交
     * @param {Object} para.para 原匹配请求参数
     * @return {int} 撤销请求提交状态
     * <ul> 
     *   <li> 0 : 提交成功 </li>
     *   <li> -1 : 数据错误，提交失败 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#cancelMatchingSucceeded
     * @emits MatchOn#cancelMatchingError
     */

    MatchOn.prototype.cancelMatchingRequest = function (para, feedback) {
        if( !para ||
            !para.cancelID ||
            !para.playerID ||
            !para.originalRequestID ||
            !para.originalAlgo)
            return -1;

        var uri = "/match/" + this.options.gameID + "/" + this.options.secrete;
        var body = {
            requestID: para.cancelID,
            playerID: para.playerID,
            algo: para.originalAlgo,
            para: para.originalRequestID
        };
        clearTimeout(this.retryHandler);
        return this.moRequest("cancelMatching", "DELETE", uri, JSON.stringify(body), para, feedback);
    };


    /**
     * @event MatchOn#joinMatchSucceeded
     * @desc 加入指定对战成功
     * @type {Object}
     * @property {Object} data 匹配结果
     * @property {string} data.matchID 后端生成的对战编号
     * @property {Array<matchMember>} data.activePlayers 对战活动玩家
     * @property {Array<matchMember>} data.inActivePlayers 对战非活动玩家
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#joinMatchError
     * @desc 加入指定对战失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     *　加入指定的对战
     * @param {Object} para 匹配请求
     * @param {string} para.requestID 本次请求编号
     * @param {string} para.matchID 加入的对战ID
     * @param {string} para.playerID 游戏玩家ID
     * @param {string} para.algo 算法ID,必须为99
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>0 : 提交建立Socket连接 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#joinMatchSucceeded
     * @emits MatchOn#joinMatchError
     */

    MatchOn.prototype.joinMatch = function (para, feedback) {

        if( !para || 
            !para.requestID || 
            !para.matchID ||
            !para.playerID ||
            !para.algo )
            return -1;

        if( para.algo !== "99")
            return -1;

        var body = JSON.stringify(para);

        var uri = "/joinmatch/" + para.matchID +"/" + this.options.gameID + "/" + this.options.secrete;

        return this.moRequest("joinMatch", "POST", uri, body, para, feedback);
    };

    /**
     * @event MatchOn#getActivePlayersSucceeded
     * @desc 获取活动玩家成功
     * @type {Object}
     * @property {Array<matchMember>} data 对战的活动玩家
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#getActivePlayersError
     * @desc 获取活动玩家失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /** 
     * 读取比赛的活动玩家列表和信息
     * @param {Object} para 读取活动玩家列表参数
     * @param {string} para.matchID 对战编号
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>0 : 提交建立Socket连接 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#getActivePlayersSucceeded
     * @emits MatchOn#getActivePlayersError
     */

    MatchOn.prototype.getActivePlayers = function (para, feedback) {
        if( !para || !para.matchID || !(typeof para.matchID === "string") )
            return -1;

        var uri = "/activeplayers/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
        return this.moRequest("getActivePlayers", "GET", uri, null, para, feedback);

    };

    /**
     * @event MatchOn#getInActivePlayersSucceeded
     * @desc 获取非活动玩家成功
     * @type {Object}
     * @property {Array<matchMember>} data 对战的活动玩家
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#getInActivePlayersError
     * @desc 获取非活动玩家失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /** 
     * 读取比赛的非活动玩家列表和信息
     * @param {Object} para 读取非活动玩家列表参数
     * @param {string} para.matchID 对战编号
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>0 : 提交建立Socket连接 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#getInActivePlayersSucceeded
     * @emits MatchOn#getInActivePlayersError
     */

    
    MatchOn.prototype.getInActivePlayers = function (para, feedback) {

        if( !para || !para.matchID || !(typeof para.matchID === "string") )
            return -1;

        var uri = "/inactiveplayers/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
        return this.moRequest("getInActivePlayers", "GET", uri, null, para, feedback);

    };
    

    /**
     * @event MatchOn#setActiveSucceeded
     * @desc 设置活动状态成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#setActiveError
     * @desc 设置活动状态失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * 将游戏非活跃用户设置为活跃状态
     * @param {Object} para：调用参数
     * @param {string} para.playerID 游戏玩家编号,
     * @param {string} para.matchID 比赛编号
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#setActiveSucceeded
     * @emits MatchOn#setActiveError
     */

    MatchOn.prototype.setActive = function(para, feedback) {
        if( !para || 
            !para.playerID || 
            !(typeof para.playerID === "string") ||
            !para.matchID ||
            !(typeof para.matchID === "string"))
            return -1;
        
        var uri = "/setactive/" + para.playerID + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
        
        return this.moRequest("setActive", "PUT", uri, null, para, feedback);

    };

    /**
     * @event MatchOn#setInActiveSucceeded
     * @desc 设置非活动状态成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#setInActiveError
     * @desc 设置非活动状态失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * 将游戏活跃用户设置为非活跃状态
     * @param {Object} para：调用参数
     * @param {string} para.playerID 游戏玩家编号,
     * @param {string} para.matchID 比赛编号
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#setInActiveSucceeded
     * @emits MatchOn#setInActiveError
     */

    MatchOn.prototype.setInActive = function(para, feedback) {
        if( !para || 
            !para.playerID || 
            !(typeof para.playerID === "string") ||
            !para.matchID ||
            !(typeof para.matchID === "string"))
            return -1;
        
        var uri = "/setinactive/" + para.playerID + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
        
        return this.moRequest("setInActive", "PUT", uri, null, para, feedback);

    };


    /**
     * @event MatchOn#playerLastMessageSucceeded
     * @desc 获取玩家指定类型最后一条消息成功
     * @type {Object}
     * @property {Object} data 最后一条消息
     * @property {string} data.type 消息类型
     * @property {Object} data.content 消息内容, 开发者自定义格式
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#playerLastMessageError
     * @desc 获取玩家最后一条消息失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * 按消息类型，获得游戏玩家在比赛中的最后一条消息
     * @param {Object} para 函数调用参数
     * @param {string} para.playerID 游戏玩家编号
     * @param {string} para.matchID 对战编号
     * @param {string} para.type 消息类型,开发者自定义
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#playerLastMessageSucceeded
     * @emits MatchOn#playerLastMessageError
     *
     */

    MatchOn.prototype.playerLastMessage = function(para,feedback) {
        if( !para || 
            !para.playerID || 
            !(typeof para.playerID === "string") ||
            !para.matchID ||
            !(typeof para.matchID === "string")||
            !para.type ||
            !(typeof para.type === "string"))

            return -1;

        var uri = "/lastmatchmsg/" + para.playerID + "/" + para.matchID + "/" + para.type + "/" + this.options.gameID + "/" + this.options.secrete;
        return this.moRequest("playerLastMessage", "GET", uri, null, para,feedback);

    };

    /**
     * @event MatchOn#playerLastMatchSucceeded
     * @desc 获取玩家最后一次对战成功
     * @type {Object}
     * @property {Object} data 最后一次对战数据
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#playerLastMatchError
     * @desc 获取玩家最后一次对战失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 获得游戏玩家的最后一次比赛的信息
     * @param {Object} para 函数调用参数
     * @param {string} para.playerID 游戏玩家编号
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#playerLastMatchSucceeded
     * @emits MatchOn#playerLastMatchError
     */

    MatchOn.prototype.playerLastMatch = function (para,feedback) {

        if( !para ||
            !para.playerID ||
            !(typeof para.playerID === "string"))
            return -1;
        var uri = "/lastmatch/" + para.playerID + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;

        return this.moRequest("playerLastMatch", "GET", uri, null, para, feedback);
    };

    /**
     * @event MatchOn#setKVSucceeded
     * @desc 设置键值对成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#setKVError
     * @desc 设置键值对失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 按作用域，设置键值对
     * @param {Object} para 函数调用参数
     * @param {string} para.domain 数据域
     *  <ul> 
     *   <li> "game"－游戏 </li>
     *   <li> "gameMatch" - 游戏/比赛 </li>
     *   <li>　"gamePlayer" - 游戏/玩家 </li> 
     *   <li> "gamePlayerMatch"　－　游戏／玩家／比赛 </li>
     *  </ul>
     * @param {string} para.keyName 主键名称，在不同作用域，主键名称可以相同
     * @param {string} para.playerID 游戏玩家编号，当domain为gamePlayer时有效
     * @param {string} para.matchID 对战编号，当domain为gamePlayerMatch和gameMatch时有效
     * @param {string} para.force 强制设置标志
     *  <ul>
     *    <li>  "s" - 设置 </li>
     *    <li> 　"l" -设置并加锁，加锁后其他人无法设置 </li>
     *    <li>  "f" - 强制设置，不论该键值是否加锁，强制更新 </li>
     *  </ul>
     * @param {string} para.keyMap 子键和值的映射
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#setKVSucceeded
     * @emits MatchOn#setKVError
     */

    MatchOn.prototype.setKV = function (para,feedback) {

        if( !para ||
            !para.force ||
            !(typeof para.force == "string")||
            !para.domain ||
            !(typeof para.domain == "string") ||
            !para.keyName ||
            !(typeof para.keyName === "string") ||
            !(para.domain === "game" ||
              para.domain === "gameMatch" ||
              para.domain === "gamePlayer" ||
              para.domain === "gamePlayerMatch"))
            return -1;

        var uri;
        switch (para.domain) {

        case "game" :
            if(!para.keyMap ||
               !(para.keyMap instanceof Object))
                return -1;

            uri = "/kkv/game/" + para.keyName + "/" +  para.force + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayer" :
            if(!para.keyMap ||
               !(para.keyMap instanceof Object) ||
               !para.playerID ||
               !(typeof para.playerID === "string"))
                return -1;
            uri = "/kkv/gameplayer/" + para.keyName + "/" +  para.force + "/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gameMatch" :
            if(!para.keyMap ||
               !(para.keyMap instanceof Object) ||
               !para.matchID ||
               !(typeof para.matchID === "string"))
                return -1;
            uri = "/kkv/gamematch/" + para.keyName + "/" +  para.force + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayerMatch" :
            if(!para.keyMap ||
               !(para.keyMap instanceof Object) ||
               !para.playerID ||
               !(typeof para.playerID === "string")||
               !para.matchID ||
               !(typeof para.matchID === "string"))

                return -1;
            uri = "/kkv/gameplayermatch/" + para.keyName + "/" +  para.force + "/" + para.playerID + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        }
        return this.moRequest("setKV", "POST", uri, JSON.stringify(para.keyMap), para,feedback);
    };

    /**
     * @event MatchOn#getKVSucceeded
     * @desc 获取键值对成功
     * @type {Object}
     * @property {Object} data 键/值对数据对象
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#getKVError
     * @desc 获取键值对失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 读取键值对
     * @param {Object} para 函数调用参数对象
     * @param {string} para.domain 数据域
     *  <ul> 
     *   <li> "game"－游戏 </li>
     *   <li> "gameMatch" - 游戏/比赛 </li>
     *   <li>　"gamePlayer" - 游戏/玩家 </li> 
     *   <li> "gamePlayerMatch"　－　游戏／玩家／比赛 </li>
     *  </ul>
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 重新连接提交状态 
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#getKVSucceeded
     * @emits MatchOn#getKVError
     */

    MatchOn.prototype.getKV = function (para, feedback) {
        if( !para ||
            !para.domain ||
            !(typeof para.domain == "string") ||
            !para.keyName ||
            !(typeof para.keyName === "string") ||
            !(para.domain == "game" ||
              para.domain == "gamePlayer" ||
              para.domain == "gameMatch" ||
              para.domain == "gamePlayerMatch"))
            return -1;

        var uri;

        switch (para.domain) {
        case "game":
            uri = "/kkv/game/" + para.keyName + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        case "gamePlayer":
            if( !para.playerID ||
                !(typeof para.playerID === "string"))
                return -1;
            uri = "/kkv/gameplayer/" + para.keyName + "/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        case "gameMatch" :
            if(!para.matchID ||
               !(typeof para.matchID === "string"))
                return -1;
            uri = "/kkv/gamematch/" + para.keyName + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayerMatch": 
            if( !para.playerID ||
                !(typeof para.playerID === "string") ||
                !para.matchID ||
                !(typeof para.matchID === "string"))
                return -1;
            uri = "/kkv/gameplayermatch/" + para.keyName + "/" + para.playerID + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        }
        
        return this.moRequest("getKV","GET", uri, null, para, feedback);

    };

    /**
     * @event MatchOn#deleteKVSucceeded
     * @desc 删除键值成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#deleteKVError
     * @desc 删除键值失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 删除键值对或键值对的之键
     * @param {Object} para 函数调用参数对象
     * @param {string} para.domain 数据域
     *  <ul> 
     *   <li> "game"－游戏 </li>
     *   <li> "gameMatch" - 游戏/比赛 </li>
     *   <li>　"gamePlayer" - 游戏/玩家 </li> 
     *   <li> "gamePlayerMatch"　－　游戏／玩家／比赛 </li>
     *  </ul>
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 请求提交状态
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#deleteKVSucceeded
     * @emits MatchOn#deleteKVError
     */

    MatchOn.prototype.deleteKV = function(para,feedback) {

        if( !para ||
            !para.domain ||
            !(typeof para.domain == "string") ||
            !para.keyName ||
            !(typeof para.keyName === "string") ||
            !(para.domain == "game" ||
              para.domain == "gamePlayer" ||
              para.domain == "gameMatch" ||
              para.domain == "gamePlayerMatch") ||
            !para.subKeys ||
            !(para.subkeys instanceof Array))
            return -1;

        var uri;

        switch(para.domain) {

        case "game":
            uri = "/kkv/game/" + para.keyName + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        case "gameMatch" :
            uri = "/kkv/gamematch/" + para.keyName  + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayer":
            uri = "/kkv/gameplayer/" + para.keyName + "/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        case "gamePlayerMatch":
            uri = "/kkv/gameplayermatch/" + para.keyName + "/" + para.playerID +"/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        }
        return this.moRequest("deleteKV","DELETE", uri, JSON.stringify(para.subKeys), para, feedback);

    };

    /**
     * @event MatchOn#checkKVLockSucceeded
     * @desc 未加锁
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#checkKVLockError
     * @desc 检查键值加锁失败
     * @type {Object}
     * @property {int} code 错误代码,如果值为570,代表已上锁,其他值代表错误,见错误代码表
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 检查键值对是否已上锁
     * @param {Object} para 函数调用参数对象
     * @param {string} para.domain 数据域
     *  <ul> 
     *   <li> "game"－游戏 </li>
     *   <li> "gameMatch" - 游戏/比赛 </li>
     *   <li>　"gamePlayer" - 游戏/玩家 </li> 
     *   <li> "gamePlayerMatch"　－　游戏／玩家／比赛 </li>
     *  </ul>
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 请求提交状态
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#checkKVLockSucceeded
     * @emits MatchOn#checkKVLockError
     */

    MatchOn.prototype.checkKVLock = function(para, feedback) {

        if( !para ||
            !para.domain ||
            !(typeof para.domain == "string") ||
            !para.keyName ||
            !(typeof para.keyName === "string") ||
            !(para.domain == "game" ||
              para.domain == "gamePlayer" ||
              para.domain == "gameMatch" ||
              para.domain == "gamePlayerMatch"))

            return -1;
        var uri;

        switch(para.domain) {

        case "game":
            uri = "/kkvlock/game/" + para.keyName + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gameMatch":
            uri = "/kkvlock/gamematch/" + para.keyName + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayer":
            uri = "/kkvlock/gameplayer/" + para.keyName + "/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayerMatch":
            uri = "/kkvlock/gameplayermatch/" + para.keyName + "/" + para.playerID +"/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        }

        return this.moRequest("checkKVLock","GET", uri, null, para, feedback);
        

    };


    /**
     * @event MatchOn#unlockKVSucceeded
     * @desc 解锁键值对成功
     * @type {Object}
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#unlockKVError
     * @desc 解锁键值对失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 解除键值对锁
     * @param {Object} para 函数调用参数对象
     * @param {string} para.domain 数据域
     *  <ul> 
     *   <li> "game"－游戏 </li>
     *   <li> "gameMatch" - 游戏/比赛 </li>
     *   <li>　"gamePlayer" - 游戏/玩家 </li> 
     *   <li> "gamePlayerMatch"　－　游戏／玩家／比赛 </li>
     *  </ul>
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 请求提交状态
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#unlockKVSucceeded
     * @emits MatchOn#unlockKVError
     */

    MatchOn.prototype.unlockKV = function(para,feedback) {
        if( !para ||
            !para.domain ||
            !(typeof para.domain == "string") ||
            !para.keyName ||
            !(typeof para.keyName === "string") ||
            !(para.domain == "game" ||
              para.domain == "gamePlayer" ||
              para.domain == "gameMatch" ||
              para.domain == "gamePlayerMatch"))

            return -1;
        var uri;

        switch(para.domain) {

        case "game":
            uri = "/kkvunlock/game/" + para.keyName + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gameMatch":
            uri = "/kkvunlock/gamematch/" + para.keyName + "/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;

        case "gamePlayer":
            uri = "/kkvunlock/gameplayer/" + para.keyName + "/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        case "gamePlayerMatch":
            uri = "/kkvunlock/gameplayermatch/" + para.keyName + "/" + para.playerID +"/" + para.matchID + "/" + this.options.gameID + "/" + this.options.secrete;
            break;
        }

        return this.moRequest("unlockKV","PUT", uri, null, para, feedback);

    };

    /**
     * @event MatchOn#getLastMatchSucceeded
     * @desc 获取最后一次对战成功
     * @type {Object}
     * @property {Object} data 数据对象
     * @property {string} data.matchID 对战ID
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#getLastMatchError
     * @desc 获取最后一次对战失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */


    /**
     * 取得游戏玩家的最近一次比赛ID
     * @param {Object} para 调用参数
     * @param {string} para.playerID 游戏玩家ID
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 请求提交状态
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#getLastMatchSucceeded
     * @emits MatchOn#getLastMatchError
     */

    MatchOn.prototype.getLastMatch = function (para, feedback) {
        if( !para ||
            !para.playerID ||
            typeof para.playerID !== "string" ||
            para.playerID.length === 0)
            return -1;
        var uri = "/lastmatch/" + para.playerID + "/" + this.options.gameID + "/" + this.options.secrete;
        return this.moRequest("getLastMatch", "GET", uri, null, para, feedback);

    };

    /**
     * @event MatchOn#getLastMatchMessageSucceeded
     * @desc 获取最后一条消息成功
     * @type {Object}
     * @property {Object} data 数据对象
     * @property {Object} data.profile 玩家基本信息
     * @property {string} data.profile.playerID 玩家ID
     * @property {string} data.profile.gameID 游戏ID
     * @property {string} data.profile.matchID 比赛ID
     * @property {Object} data.data 消息数据
     * @property {string} data.data.type 消息类型,开发者自定义
     * @property {Object} data.data.content 消息内容,开发自定义
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * @event MatchOn#getLastMatchMessageError
     * @desc 获取最后一次对战消息失败
     * @type {Object}
     * @property {int} code 错误代码
     * @property {Object} feedback 调用函数时传入的回调对象
     * @property {Object} para 调用新匹配时的参数
     */

    /**
     * 按消息类型，取得游戏玩家的最后一条比赛消息
     * @param {Object} para 函数调用参数对象
     * @param {string} para.playerID 游戏玩家ID
     * @param {string} para.matchID 对战ID
     * @param {string} para.type 消息类型,开发者自定义, 必须为两个字节长
     * @param {Object} feedback: 回调对象,在事件中回传
     * @return {int} 请求提交状态
     * <ul>
     *  <li> -1 : 参数错误 </li>
     *  <li>  0 : 请求提交到后端 </li>
     * </ul>
     * @memberof MatchOn
     * @emits MatchOn#getLastMatchMessageSucceeded
     * @emits MatchOn#getLastMatchMessageError
     *
     */

    MatchOn.prototype.getLastMatchMessage = function (para, feedback) {
        if( !para ||
            !para.playerID ||
            typeof para.playerID !== "string" ||
            para.playerID.length === 0 ||
            !para.matchID ||
            typeof para.matchID !== "string" ||
            para.matchID.length === 0 ||
            !para.type ||
            typeof para.type !== "string" ||
            para.type.length != 2
          )
            return -1;

        var uri = "/lastmatchmsg/" + para.playerID + "/" + para.matchID + "/" + para.type + "/" + this.options.gameID + "/" + this.options.secrete;
        return this.moRequest("getLastMatchMessage", "GET", uri, null, para, feedback);

    };

    return MatchOn;
    
}));
