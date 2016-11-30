# 麦琪JavaScript API

## 说明

麦琪JavaScript API由[画笔(上海)网络科技有限公司](http://matchon.cn)开发,用于Web/H5/React Native等通过Web标准协议和JavaScript语言获取麦琪云对战服务.

麦琪API采用开源的MIT协议.代码托管在[Github](http://github.com)和[码云](http://git.oschina.net)上.

## 反馈途径

欢迎开发者通过Github或者码云提交Issue, 提出您的问题,或者发现的Bug,我们将在第一时间跟进予以解答.

## MoEventEmitter

麦琪JavaScript API采用了与Nodejs的消息模式兼容的异步消息驱动的设计,通过继承一个MoEventEmitter对象,获得发布,订阅和取消消息订阅的API.

MoEventEmitter也托管在Github上. [从这里进入](https://github.com/matchon-on/MoEventEmitter)

MoEventEmitter来源于Github的EventEmitter开源项目,仅用于MatchOn API. 尽管MoEventEmitter也可以作为通用的JavaScript消息库, 我们建议您使用EventEmitter作为通用目的的JavaScript消息引擎. 这是EventEmitter在[Github的链接](https://github.com/Olical/EventEmitter.git)

## 麦琪JavaScript开发者入门和指南

这是麦琪 JavaScript API的文档, 是最完备的参考手册.但是在官网的[开发者入门]()能够帮助您更快的入门, [开发者指南]()能够帮助您更完整的理解麦琪的API的整体结构和关键要素. 我们建议您仔细阅读这些文档.

## 麦琪API安装

### 直接在网页中加载

```
<script src="http://"></script>
<script src="http://"></script>
```

### 通过NPM

```
npm install matchon-core --save
npm install MoEventEmitter --save

```
