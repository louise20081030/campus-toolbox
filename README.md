<picture>
    <source srcset="./.github/logo-dark.png" media="(prefers-color-scheme: light)">
    <source srcset="./.github/logo-white.png" media="(prefers-color-scheme: dark)">
    <img src="./.github/logo-dark.png" alt="logo">
</picture>

<p align="center">
Useful tools for developer and people working in IT. <a href="https://it-tools.tech">Try it!</a>
</p>

---

# 校园工具箱 Campus Toolbox（本项目是基于 IT-Tools 的 fork）

> 上游项目：[CorentinTh/it-tools](https://github.com/CorentinTh/it-tools)（GPL-3.0）
> 本 fork：[`campus-toolbox`](https://github.com/louise20081030/campus-toolbox)，同样以 **GPL-3.0** 开源。

IT-Tools 是给开发者用的工具集合，我们把它改造成**给大学生每天用的工具箱**：保留原项目全部能力，新增一个「校园学习」分类，加入三个原项目没有的工具，并把界面默认切到中文、补齐离线可用能力。

## 新增了什么

| 工具 | 路径 | 解决什么问题 |
| --- | --- | --- |
| 绩点 / 加权平均分换算 | `/gpa-calculator` | 粘贴教务系统成绩即可算出 GPA 与学分加权平均分，5 种算法（标准 4.0 / 北大 / 浙大 4.0 / 浙大 5.0 / WES）横向对比，自定义分档表，还给出「提分性价比榜」和目标 GPA 反推 |
| 课表冲突检测 | `/schedule-conflict` | 按「星期 × 节次 × 周次」做交集检测，单双周错开的课不会误判；自动生成周课表网格、空闲时段和课表概览 |
| 参考文献格式转换 | `/reference-formatter` | 填一次字段同时输出 GB/T 7714-2015 / APA 7 / MLA 9 / IEEE / BibTeX，支持反向解析和批量转换 |

三个工具都遵循原项目的「一个工具 = 一个组件」约定，代码位于 `src/tools/<工具名>/`，逻辑与视图分离（`.service.ts` + `.vue`），可直接复用上游的 UI 组件与主题。

## 还改了什么

- **中文界面**：默认语言改为简体中文（`src/plugins/i18n.plugin.ts`），新增分类「校园学习」及三个工具的中文词条（`locales/zh.yml`），分类名支持 i18n（`src/components/CollapsibleToolMenu.vue`）。
- **离线可用**：强化 PWA 配置（`vite.config.ts`）——预缓存全部静态资源 + `navigateFallback`，断网时仍可打开使用；导航栏在离线时给出提示（`IconCloudOff`）。
- **隐私**：三个新工具的全部计算都在浏览器本地完成，成绩与课表只存在 `localStorage`，没有任何后端请求。

## 关于 GPL-3.0（重要）

上游 IT-Tools 采用 **GNU GPL v3**。GPL 具有传染性：只要我们把改动后的版本**对外分发或作为网络服务提供给同学使用**，就必须以同样的 GPL-3.0 许可公开**全部修改后的源代码**。因此我们明确承诺：

1. 本仓库保持 **GPL-3.0** 许可，`LICENSE` 文件不做修改；
2. 所有修改过的文件在文件头注明改动与日期（见各文件注释）；
3. 若公开部署，会在站点显著位置提供「本站点源码」链接指向本仓库，并保留上游作者署名；
4. 不把本项目的任何部分以闭源形式打包、上架或授权给第三方；
5. 新增工具同样以 GPL-3.0 发布，任何二次使用者享有同样的权利与义务。

这不是限制，而是我们选择它的原因之一：校园场景里，同学之间互相改进工具、共享成果才是常态。

## 本地运行

```sh
pnpm install
pnpm dev        # 开发预览
pnpm build      # 构建（含类型检查）
```

---

## Functionalities and roadmap

Please check the [issues](https://github.com/CorentinTh/it-tools/issues) to see if some feature listed to be implemented.

You have an idea of a tool? Submit a [feature request](https://github.com/CorentinTh/it-tools/issues/new/choose)!

## Self host

Self host solutions for your homelab

**From docker hub:**

```sh
docker run -d --name it-tools --restart unless-stopped -p 8080:80 corentinth/it-tools:latest
```

**From github packages:**

```sh
docker run -d --name it-tools --restart unless-stopped -p 8080:80 ghcr.io/corentinth/it-tools:latest
```

**Other solutions:**

- [Cloudron](https://www.cloudron.io/store/tech.ittools.cloudron.html)
- [Tipi](https://www.runtipi.io/docs/apps-available)
- [Unraid](https://unraid.net/community/apps?q=it-tools)

## Contribute

### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) with the following extensions:

- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)
- [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [i18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)

with the following settings:

```json
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "i18n-ally.localesPaths": ["locales", "src/tools/*/locales"],
  "i18n-ally.keystyle": "nested"
}
```

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

### Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

### Create a new tool

To create a new tool, there is a script that generate the boilerplate of the new tool, simply run:

```sh
pnpm run script:create:tool my-tool-name
```

It will create a directory in `src/tools` with the correct files, and a the import in `src/tools/index.ts`. You will just need to add the imported tool in the proper category and develop the tool.

## Contributors

Big thanks to all the people who have already contributed!

[![contributors](https://contrib.rocks/image?repo=corentinth/it-tools&refresh=1)](https://github.com/corentinth/it-tools/graphs/contributors)

## Credits

Coded with ❤️ by [Corentin Thomasset](https://corentin.tech?utm_source=it-tools&utm_medium=readme).

This project is continuously deployed using [vercel.com](https://vercel.com).

Contributor graph is generated using [contrib.rocks](https://contrib.rocks/preview?repo=corentinth/it-tools).

<a href="https://www.producthunt.com/posts/it-tools?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-it&#0045;tools" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=345793&theme=light" alt="IT&#0032;Tools - Collection&#0032;of&#0032;handy&#0032;online&#0032;tools&#0032;for&#0032;devs&#0044;&#0032;with&#0032;great&#0032;UX | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
<a href="https://www.producthunt.com/posts/it-tools?utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-it&#0045;tools" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=345793&theme=light&period=daily" alt="IT&#0032;Tools - Collection&#0032;of&#0032;handy&#0032;online&#0032;tools&#0032;for&#0032;devs&#0044;&#0032;with&#0032;great&#0032;UX | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

## License

This project is under the [GNU GPLv3](LICENSE).
