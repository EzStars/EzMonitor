本项目采用新一代性能监控API：`PerformanceObserver` ，它可以精准的记录一些性能指标，可以有效的帮助我们去针对性的优化项目。并且它是基于事件驱动的异步监测方式，不会阻塞主线程的执行。

我们直接切入主题，看看这个API可以监测哪些性能数据（带 `*` 是比较常用的性能指标的条目）

我们也可以通过 `PerformanceObserver.supportedEntryTypes` 来查看浏览器支持哪些性能条目，下面是我谷歌浏览器所输出的 `entryTypes`。

## 为什么使用 PerformanceObserver

那么，为什么我们要选择PerformanceObserver呢？它的独特优势在于：

1.  实时性：PerformanceObserver能够实时捕获性能事件，让你在第一时间了解网页的性能表现。这对于及时发现并解决问题至关重要。
1.  灵活性：通过配置PerformanceObserver的回调函数，你可以自定义处理性能数据的方式。无论是简单的日志记录，还是复杂的性能分析，都能轻松应对。
1.  可扩展性：随着Web标准的不断发展，PerformanceObserver支持的性能条目也在不断增加。这意味着你可以用它来监控更多类型的性能数据，满足日益增长的性能优化需求。
1.  易用性：虽然PerformanceObserver提供了强大的功能，但它的API设计相对简洁直观。即使是初学者，也能较快上手并应用到实际项目中。

# PerformanceObserver

## 基础示例

```  javascript
function perf_observer(list, observer) {
  // Process the "measure" event
  // 处理 "measure" 事件
}
const observer2 = new PerformanceObserver(perf_observer)
observer2.observe({ entryTypes: ['measure'] })
```

## 参考资料

[深入使用 PerformanceObserver 提到性能监控，你可能会想到performance API，但今天，我想 - 掘金](https://juejin.cn/post/7389164547029024809)

[mdn web docs](https://developer.mozilla.org/zh-CN/docs/Web/API/PerformanceObserver)
