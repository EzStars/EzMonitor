import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Row, Col, message, Tag, Typography } from 'antd';
import { sdk } from '../../api/sdk'; // 假设你的 SDK 实例在这里导出
import { TrackingPlugin } from '@ezstars/monitor-sdkv2';

const { Title, Paragraph, Text } = Typography;

const TrackingTestPage: React.FC = () => {
  const [trackingPlugin, setTrackingPlugin] = useState<TrackingPlugin | null>(
    null,
  );
  const [eventName, setEventName] = useState('button_click');
  const [eventProps, setEventProps] = useState('{"key": "value"}');
  const [userId, setUserId] = useState('user-123');
  const [userProps, setUserProps] = useState('{"plan": "premium"}');
  const [pagePath, setPagePath] = useState('/tracking-test');
  const [pageProps, setPageProps] = useState('{"source": "manual"}');
  const [contextProps, setContextProps] = useState('{"experiment": "A"}');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 确保 SDK 已初始化和启动
        const currentStatus = sdk.getStatus();
        if (currentStatus === 'idle') {
          await sdk.init({ appId: 'monitor-web-test' });
        }
        if (currentStatus !== 'started') {
          await sdk.start();
        }

        // 检查插件是否已注册
        const registration = sdk.getCore().pluginManager.get('tracking');
        let plugin: TrackingPlugin;

        if (!registration) {
          console.log(
            'Tracking plugin not found, creating and registering a new one.',
          );
          plugin = new TrackingPlugin({
            enableBatch: true,
            batchInterval: 5000,
            batchSize: 10,
            autoTrackPage: false, // 在测试页面手动控制
          });
          sdk.use(plugin);
          // 新注册的插件需要手动初始化和启动
          await plugin.init?.(sdk.getConfig(), sdk.getEventBus());
          await plugin.start?.();
        } else {
          // 从 registration 中获取插件实例
          plugin = registration.plugin as TrackingPlugin;
        }

        setTrackingPlugin(plugin);

        // 监听事件总线
        const eventBus = sdk.getEventBus();
        const offReport = eventBus.on('report:data', (payload: any) => {
          if (payload.type === 'tracking') {
            addLog(`[REPORT_DATA] ${JSON.stringify(payload.data)}`);
          }
        });
        const offBatchReport = eventBus.on('report:batch', (payload: any) => {
          addLog(
            `[REPORT_BATCH] Batch of ${payload.items.length} items: ${JSON.stringify(payload.items)}`,
          );
        });

        addLog('SDK and Tracking Plugin are ready.');

        return () => {
          offReport();
          offBatchReport();
        };
      } catch (error) {
        message.error('SDK 初始化失败');
        console.error(error);
      }
    };

    initializeSDK();
  }, []);

  const addLog = (text: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev]);
  };

  const handleTrackEvent = () => {
    if (!trackingPlugin) return;
    try {
      const props = JSON.parse(eventProps);
      trackingPlugin.track(eventName, props);
      message.success(`Event '${eventName}' tracked.`);
      addLog(`Tracked event: '${eventName}' with props: ${eventProps}`);
    } catch (e) {
      console.error('事件属性 JSON 格式错误', e);
      message.error('事件属性 JSON 格式错误');
    }
  };

  const handleTrackUser = () => {
    if (!trackingPlugin) return;
    try {
      const props = JSON.parse(userProps);
      trackingPlugin.trackUser(userId, props);
      message.success(`User '${userId}' tracked.`);
      addLog(`Tracked user: '${userId}' with props: ${userProps}`);
    } catch (e) {
      message.error('用户属性 JSON 格式错误');
    }
  };

  const handleTrackPage = () => {
    if (!trackingPlugin) return;
    try {
      const props = JSON.parse(pageProps);
      trackingPlugin.trackPage(pagePath, props);
      message.success(`Page '${pagePath}' tracked.`);
      addLog(`Tracked page: '${pagePath}' with props: ${pageProps}`);
    } catch (e) {
      message.error('页面属性 JSON 格式错误');
    }
  };

  const handleSetContext = () => {
    if (!trackingPlugin) return;
    try {
      const props = JSON.parse(contextProps);
      trackingPlugin.setContext(props);
      message.success('上下文已设置');
      addLog(`Context set: ${contextProps}`);
    } catch (e) {
      message.error('上下文 JSON 格式错误');
    }
  };

  const handleFlush = () => {
    if (!trackingPlugin) return;
    trackingPlugin.flush();
    message.info('Flush command sent.');
    addLog('Manual flush triggered.');
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>自定义埋点测试页面</Title>
      <Paragraph>
        这个页面允许您测试 <Text code>TrackingPlugin</Text> 的各项功能。
        您可以在下方输入参数，然后点击按钮来触发不同的埋点事件。 所有通过{' '}
        <Text code>EventBus</Text> 广播的上报事件都会显示在日志区域。
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="事件埋点 (track)">
            <Input
              addonBefore="事件名称"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
            />
            <Input.TextArea
              rows={3}
              addonBefore="事件属性 (JSON)"
              value={eventProps}
              onChange={e => setEventProps(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Button
              type="primary"
              onClick={handleTrackEvent}
              style={{ marginTop: 8 }}
            >
              发送事件埋点
            </Button>
          </Card>

          <Card title="用户埋点 (trackUser)" style={{ marginTop: 16 }}>
            <Input
              addonBefore="用户 ID"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
            <Input.TextArea
              rows={3}
              addonBefore="用户属性 (JSON)"
              value={userProps}
              onChange={e => setUserProps(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Button
              type="primary"
              onClick={handleTrackUser}
              style={{ marginTop: 8 }}
            >
              发送用户埋点
            </Button>
          </Card>

          <Card title="页面埋点 (trackPage)" style={{ marginTop: 16 }}>
            <Input
              addonBefore="页面路径"
              value={pagePath}
              onChange={e => setPagePath(e.target.value)}
            />
            <Input.TextArea
              rows={3}
              addonBefore="页面属性 (JSON)"
              value={pageProps}
              onChange={e => setPageProps(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Button
              type="primary"
              onClick={handleTrackPage}
              style={{ marginTop: 8 }}
            >
              发送页面埋点
            </Button>
          </Card>

          <Card title="上下文管理" style={{ marginTop: 16 }}>
            <Input.TextArea
              rows={3}
              addonBefore="上下文 (JSON)"
              value={contextProps}
              onChange={e => setContextProps(e.target.value)}
            />
            <Button
              onClick={handleSetContext}
              style={{ marginTop: 8, marginRight: 8 }}
            >
              设置上下文
            </Button>
            <Button
              onClick={() =>
                trackingPlugin?.clearContext() && addLog('Context cleared.')
              }
            >
              清空上下文
            </Button>
          </Card>

          <Card title="手动上报" style={{ marginTop: 16 }}>
            <Button danger onClick={handleFlush}>
              立即上报所有缓存事件 (Flush)
            </Button>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="事件日志" style={{ height: '100%' }}>
            <div
              style={{
                height: 600,
                overflowY: 'auto',
                background: '#f0f2f5',
                padding: 8,
              }}
            >
              {log.map((l, i) => (
                <div
                  key={i}
                  style={{ marginBottom: 4, wordBreak: 'break-all' }}
                >
                  <Tag color={l.includes('REPORT_BATCH') ? 'blue' : 'green'}>
                    {l.split(']')[0]}]
                  </Tag>
                  {l.substring(l.indexOf(']') + 1)}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TrackingTestPage;
