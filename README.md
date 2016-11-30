# 麦琪JavaScript API

## 说明

麦琪JavaScript API由[画笔(上海)网络科技有限公司](http://matchon.cn)开发,用于Web/H5/React Native等通过Web标准协议和JavaScript语言获取麦琪云对战服务.

麦琪API采用开源的MIT协议.代码托管在[Github](http://github.com)和[码云](http://git.oschina.net)上.

## 麦琪(MatchOn)云对战平台

麦琪云对战平台由画笔(上海)网络科技有限公司开发和运营, 为网络游戏开发者提供三大服务:

- 对战对手匹配
- 游戏消息通讯
- 键值对管理

游戏开发者不再需要自行开发对手匹配引擎, 消息通讯引擎和键值对管理后台,直接通过麦琪的API,就能立刻获得这些服务.

使用麦琪云对战平台,游戏开发者可以专注于游戏可玩性, 节省开发运营成本,加快开发速度.

进入[麦琪(MatchOn)](http://matchon.cn)官网了解详细信息.

## 反馈途径

欢迎开发者通过Github或者码云提交Issue, 提出您的问题,或者发现的Bug,我们将在第一时间跟进予以解答.

## MoEventEmitter

麦琪JavaScript API采用了与Nodejs的消息模式兼容的异步消息驱动的设计,通过继承一个MoEventEmitter对象,获得发布,订阅和取消消息订阅的API.

MoEventEmitter也托管在Github上. [从这里进入](https://github.com/matchon-on/MoEventEmitter)

MoEventEmitter来源于Github的EventEmitter开源项目,仅用于MatchOn API. 尽管MoEventEmitter也可以作为通用的JavaScript消息库, 我们建议您使用EventEmitter作为通用目的的JavaScript消息引擎. 这是EventEmitter在[Github的链接](https://github.com/Olical/EventEmitter.git)

## 依赖

本API继承了MoEventEmitter. 请参见 麦琪API安装, 了解如何加载MoEventEmitter.

## 文档

请参考麦琪(MatchOn)[开发者文档](http://matchon.cn/docs.html)

## 最小化

您可以直接从这个仓库里获取已经最小化的JavaScript文件.如果您复制了源代码库,也可使用`tools/dist.sh`编译.



## 麦琪API安装

### 直接在网页中加载

```
<script src="http://"></script>
<script src="http://"></script>
```

### 通过NPM

```
npm install MoEventEmitter --save
npm install MatchOnCore --save

```

## 复制

您可以直接使用git clone命令复制这个仓库.
```
git clone git://github.com/matchon-on/MoEventEmitter.git
```
