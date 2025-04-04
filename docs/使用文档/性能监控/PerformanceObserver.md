本项目采用新一代性能监控API：`PerformanceObserver` ，它可以精准的记录一些性能指标，可以有效的帮助我们去针对性的优化项目。并且它是基于事件驱动的异步监测方式，不会阻塞主线程的执行。

我们直接切入主题，看看这个API可以监测哪些性能数据（带 `*` 是比较常用的性能指标的条目）

我们也可以通过 `PerformanceObserver.supportedEntryTypes` 来查看浏览器支持哪些性能条目，下面是我谷歌浏览器所输出的 `entryTypes`。

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/5aa8b7759f9f479da94498f2545a502e~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgTmkwZHVhbm4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzYzMTAyMzcwNjg2NTg5MiJ9&rk3s=e9ecf3d6&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1743864301&x-orig-sign=kSfEYxrDMQ%2Bfctu6OegNwS9LpPk%3D)

  


![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/11fde7e7bc2b4aecb8057d79de9592bb~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgTmkwZHVhbm4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzYzMTAyMzcwNjg2NTg5MiJ9&rk3s=e9ecf3d6&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1743864301&x-orig-sign=qFhjRKm6STRUY7rOYd7SvxvuyzE%3D)

  





## 为什么使用 PerformanceObserver

那么，为什么我们要选择PerformanceObserver呢？它的独特优势在于：

1.  实时性：PerformanceObserver能够实时捕获性能事件，让你在第一时间了解网页的性能表现。这对于及时发现并解决问题至关重要。
1.  灵活性：通过配置PerformanceObserver的回调函数，你可以自定义处理性能数据的方式。无论是简单的日志记录，还是复杂的性能分析，都能轻松应对。
1.  可扩展性：随着Web标准的不断发展，PerformanceObserver支持的性能条目也在不断增加。这意味着你可以用它来监控更多类型的性能数据，满足日益增长的性能优化需求。
1.  易用性：虽然PerformanceObserver提供了强大的功能，但它的API设计相对简洁直观。即使是初学者，也能较快上手并应用到实际项目中。

# PerformanceObserver

## 基础示例

下面我将通过一个简单的例子来介绍PerformanceObserver的基础使用。这个例子将展示如何设置一个PerformanceObserver来监听页面上的resource性能条目，即资源加载事件。

```
js
 代码解读
复制代码
// 创建一个 PerformanceObserver 实例  const performanceObserver = new PerformanceObserver((list) => {    // 回调函数会在每次有匹配的 PerformanceEntry 被添加到 PerformanceTimeline 时被调用    for (const entry of list.getEntries()) {      // 检查 entry 类型是否为我们关注的 'resource'      if (entry.entryType === 'resource') {        console.log(`Resource loaded: ${entry.name}`);        console.log(`Duration: ${entry.duration} ms`);        console.log(`Initiator Type: ${entry.initiatorType}`); // 哪个类型的事件触发了这个资源的加载        // 可以根据需要添加更多日志或处理逻辑      }    }  });    // 告诉 PerformanceObserver 我们想要监听哪些类型的 PerformanceEntry  // 在这个例子中，我们监听 'resource' 类型的条目  performanceObserver.observe({ type: 'resource' });  
```

## 静态方法

通过上面的基础示例了解了 PerformanceObserver 的使用, 除了监听 resource 还可以监听其他的类型。你可以通过PerformanceObserver 的静态方法 supportedEntryTypes 查询当前浏览器支持哪些类型的性能条目（PerformanceEntry）。

```
JS
 代码解读
复制代码
// 检查浏览器支持的 PerformanceEntry 类型  const supportedTypes = PerformanceObserver.supportedEntryTypes; 
```

![](https://p0-xtjj-private.juejin.cn/tos-cn-i-73owjymdk6/3ac0ea249ca440bb9724f8d36afea52c~tplv-73owjymdk6-jj-mark-v1:0:0:0:0:5o6Y6YeR5oqA5pyv56S-5Yy6IEAgTmkwZHVhbm4=:q75.awebp?policy=eyJ2bSI6MywidWlkIjoiMzYzMTAyMzcwNjg2NTg5MiJ9&rk3s=e9ecf3d6&x-orig-authkey=f32326d3454f2ac7e96d3d06cdbb035152127018&x-orig-expires=1743864301&x-orig-sign=Ibg%2B6ouVCIoneUPOO4j45acqvLA%3D)

## 实例方法

-   创建实例
-   通过实例 observe() 监听多个性能条目
-   可以通过 disconnect() 取消监听性能条目

```
js
 代码解读
复制代码
// 创建实例，当记录指定类型的性能条目出现时，性能监测对象的回调函数将会被调用。const observer = new PerformanceObserver(function (list, obj) {  var entries = list.getEntries();  for (var i = 0; i < entries.length; i++) {    // mark、element 的性能条目会在这里触发  }});// 监听指定性能条目，observer.observe({ type: 'mark' });// 可设置多个监听observer.observe({ type: 'element' });setTimeout(()=> {    // 取消监听    observer.disconnect();}, 3000)
```

### observer.observe()

针对 observe 方法需要详细再说明下。他支持多个参数

```
JS
 代码解读
复制代码
observer.observe({    type: 'navigation',    buffer: true})
```

-   type type 是一个字符串，用于指定您只关心的**一种**性能条目类型。例如，如果您只关心页面加载（navigation）的性能数据，就可以使用此选项。

-   bufferd 是否缓存加载过的性能条目，这样在 observe 监控调用之前发生的性能条目也会触发回调。**必须与 type 选项**一起使用。

-   entryTypes 一个字符串对象的数组，每个字符串指定一个要观察的性能条目类型。不能与 “type”、“buffered” 或 “durationThreshold” 选项一起使用。

-   durationThreshold 当你使用 PerformanceObserver API 来观察浏览器的性能条目（performance entries）时，durationThreshold 是一个可选的配置项，它允许你设置一个阈值，以便只接收那些持续时间超过该阈值的条目。

    -   durationThreshold 的默认值是 104ms：这意味着，默认情况下，PerformanceObserver 只会向你报告那些持续时间超过 104 毫秒的性能条目。
    -   设置为 16ms 以获取更多交互：由于许多用户交互（如点击、滚动等）的响应时间通常远小于 104 毫秒，因此如果你对这类快速交互感兴趣，你可能需要将 durationThreshold 降低到 16 毫秒或更低。这样做可以让你捕获到更多的交互事件，并了解它们的性能特性。
    -   最小 durationThreshold 是 16ms：这是 API 的一个限制，你不能将 durationThreshold 设置为小于 16 毫秒的值。这是因为低于这个值的性能条目可能对于大多数应用来说并不重要，而且过于频繁地触发观察者可能会导致性能下降。

-   请注意，durationThreshold 主要与那些**具有持续时间**的性能条目相关，如 longtask、event 类型的条目。对于其他类型的条目（如 mark、measure 等），这个阈值可能不适用或具有不同的含义。

## PerformanceEntry

### 基本介绍

PerformanceEntry是一个通用接口，它定义了一系列属性，如name（性能条目的名称）、entryType（性能条目的类型）、startTime（开始时间戳）、duration（持续时间，如果适用）等，用于描述一个性能事件的各个方面。不同的性能事件（如资源加载、页面渲染等）会生成不同类型的**PerformanceEntry**对象，这些对象都是PerformanceEntry的子类，各自拥有一些特定的属性和方法。

PerformanceObserver会自动为你捕获PerformanceEntry，并在你指定的回调函数中将它们作为参数传递给你。

每当有匹配的性能事件发生时，PerformanceObserver就会调用你的回调函数，并将一个包含新性能条目的PerformanceObserverEntryList对象作为参数传递给你。你可以通过遍历 **PerformanceObserverEntryList.getEntries()** 来访问每个PerformanceEntry对象。

```
const p = new PerformanceObserver(list => {    // PerformanceObserverEntryList 对象    const entries = list.getEntries()    for(let entry of entries) {        console.log('entry:', entry)    }})p.observe({    type: 'navigation',    buffered: true})
```

一旦你获得了PerformanceEntry对象，你就可以利用它提供的属性和方法来分析和优化你的网页性能了。

  


## 参考资料

[深入使用 PerformanceObserver 提到性能监控，你可能会想到performance API，但今天，我想 - 掘金](https://juejin.cn/post/7389164547029024809)