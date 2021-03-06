# 麦琪JavaScript API

麦琪JavaScript API由[画笔(上海)网络科技有限公司](http://matchon.cn)开发,用于Web/H5/React Native等通过Web标准协议和JavaScript语言获取麦琪云对战服务.

麦琪API采用开源的MIT协议.代码托管在[Github](https://github.com/matchon-on/MatchOn)和[码云](https://git.oschina.net/matchon/MatchOn)上.

## 麦琪(MatchOn)云对战平台

麦琪云对战平台由画笔(上海)网络科技有限公司开发和运营, 为网络游戏开发者提供三大服务:

- 对战对手匹配
- 游戏消息通讯
- 键值对管理

游戏开发者不再需要自行开发对手匹配引擎, 消息通讯引擎和键值对管理后台,直接通过麦琪的API,就能立刻获得这些服务.

使用麦琪云对战平台,游戏开发者可以专注于游戏可玩性, 节省开发运营成本,加快开发速度.

进入[麦琪(MatchOn)](http://matchon.cn)官网了解详细信息.

## 反馈

欢迎开发者通过Github或者码云提交Issue, 提出您的问题,或者发现的Bug,我们将在第一时间跟进予以解答.

## 消息引擎 MoEventEmitter

麦琪JavaScript API采用了与Nodejs的消息模式兼容的异步消息驱动的设计,通过继承一个MoEventEmitter对象,获得发布,订阅和取消消息订阅的API.

MatchOn对象继承了MoEventEmitter. 您可以在MatchOn对象上调用所有MoEventEmitter的消息函数,不需要另外再继承或创建MoEventEmitter对象.

MoEventEmitter也托管在[Github](https://github.com/matchon-on/MoEventEmitter)和[码云](https://git.oschina.net/matchon/MoEventEmitter)上.

MoEventEmitter来源于Github的EventEmitter开源项目,仅用于MatchOn API. 尽管MoEventEmitter也可以作为通用的JavaScript消息库, 我们建议您使用EventEmitter作为通用目的的JavaScript消息引擎. 这是EventEmitter在[Github的链接](https://github.com/Olical/EventEmitter.git)

## 依赖

本API继承了MoEventEmitter. 请参见 麦琪API安装, 了解如何加载MoEventEmitter.

## 文档

请参考麦琪(MatchOn)[开发者文档](http://matchon.cn/doc.html)

## 最小化

您可以直接从这个仓库里获取已经最小化的JavaScript文件.如果您复制了源代码库,也可已在项目目录下使用`tools/dist.sh`编译.

## 麦琪API安装

### 直接在网页中加载

***含注释的完整JavaScript***
```
<script src="https://matchon.cn/libs/MoEventEmitter.js"></script>
<script src="https://matchon.cn/libs/matchon-core.js"></script>
```

***最小化的JavaScript***
```
<script src="https://matchon.cn/libs/MoEventEmitter.min.1.1.3.js"></script>
<script src="https://matchon.cn/libs/matchon-core.min.1.0.0.js"></script>

```

### 通过NPM

```
npm install moeventemitter --save
npm install matchon-core --save

```

## 复制

您可以通过Git Clone命令,将这两个库复制到本机上.

***Github***
```
git clone git://github.com/matchon-on/MoEventEmitter.git
git clone git://github.com/matchon-on/MatchOn.git
```

***码云***
```
git clone git://git.oschina.net/matchon/MoEventEmitter.git
git clone git://git.oschina.net/matchon/MatchOn.git
```
