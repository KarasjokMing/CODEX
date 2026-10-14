# 酒馆快捷删除单条消息

在每条消息的正文上方显示一个「删除本条」按钮。适合安装了酒馆助手、正文显示 HTML 界面时快速删除指定楼层。

## 安装

1. 安装并启用 [酒馆助手](https://github.com/N0VI028/JS-Slash-Runner)。
2. 酒馆 → 扩展 → 安装扩展，粘贴 `https://github.com/KarasjokMing/CODEX`，选择「为我安装」。
3. 刷新酒馆页面，打开聊天。

不需要安装 Node 依赖，也不用导入正则或修改角色卡。

## 使用

点击要删除的那条消息上方的「删除本条」，查看楼层号和正文预览，然后确认。只删除这一条用户/AI消息（包括这一楼的所有备选回复），不会删除后续楼层。也可以删除首楼或空消息。

按钮位于酒馆父页面、正文外部，因此酒馆助手的 iframe 渲染不会替换它。某些全屏遮挡整个父页面的角色卡需要先退出全屏。

## 注意

- 使用酒馆助手 `TavernHelper.deleteChatMessages([id], { refresh: 'affected' })` 删除、刷新并保存聊天，不只是移除显示内容。
- 删除不能由本插件撤销。重要聊天请先通过「管理聊天文件」导出备份。
- 生成中不能删除；确认期间若切换聊天或目标楼层变化，会取消这次操作。
- 只删除当前楼层，不回滚 MVU、表格、摘要等第三方插件的全局状态；这些功能的处理方式由对应插件决定。
- 本插件不收集信息，不包含网络请求或第三方 CDN。

## 兼容与验证

基于 SillyTavern 1.13.4 的 `getContext()` 与酒馆助手公开接口开发。较新版本保持这些接口时也可使用。未在用户真实酒馆中实测；自定义主题和全屏界面可能影响按钮可见性。

开发验证：`npm test` 与 `npm run check`。仓库包含测试，覆盖精确删除、取消、聊天切换、生成中保护与并发点击。

接口参考：[SillyTavern 扩展文档](https://docs.sillytavern.app/for-contributors/writing-extensions/)、[酒馆助手消息接口源码](https://github.com/N0VI028/JS-Slash-Runner/blob/main/src/function/chat_message.ts)。
