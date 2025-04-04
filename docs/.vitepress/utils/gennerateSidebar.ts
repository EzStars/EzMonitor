import fs from 'fs';
import path from 'path';

interface SidebarItem {
  text: string;
  items?: SidebarItem[];
  link?: string;
  collapsible?: boolean;
  collapsed?: boolean;
}

interface SidebarConfig {
  [key: string]: SidebarItem[];
}

const EXCLUDE_FILES = [
  '.vitepress',
  'node_modules',
  '.git',
  'public',
  'assets',
];

export function generateSidebar(): SidebarConfig {
  const docsPath = path.resolve(__dirname, '../../');
  const sidebarConfig: SidebarConfig = {};

  // 获取所有一级目录
  const directories = fs.readdirSync(docsPath).filter(file => {
    const filePath = path.join(docsPath, file);
    return fs.statSync(filePath).isDirectory() && !EXCLUDE_FILES.includes(file);
  });

  // 为每个一级目录生成侧边栏配置
  directories.forEach(dir => {
    const dirPath = path.join(docsPath, dir);
    sidebarConfig[`/${dir}/`] = walkDir(dirPath);
  });

  // 根目录的侧边栏配置
  sidebarConfig['/'] = generateRootSidebar(docsPath);

  return sidebarConfig;
}

function generateRootSidebar(docsPath: string): SidebarItem[] {
  const items: SidebarItem[] = [];
  const files = fs
    .readdirSync(docsPath)
    .filter(
      file =>
        !EXCLUDE_FILES.includes(file) &&
        file.endsWith('.md') &&
        file !== 'README.md',
    )
    .sort();

  files.forEach(file => {
    items.push({
      text: formatText(file.replace('.md', '')),
      link: `/${file.replace('.md', '')}`,
    });
  });

  return items;
}

function walkDir(dir: string): SidebarItem[] {
  const items: SidebarItem[] = [];
  const files = fs
    .readdirSync(dir)
    .filter(file => !file.startsWith('.'))
    .sort((a, b) => {
      const aStats = fs.statSync(path.join(dir, a));
      const bStats = fs.statSync(path.join(dir, b));
      if (aStats.isDirectory() && !bStats.isDirectory()) return -1;
      if (!aStats.isDirectory() && bStats.isDirectory()) return 1;
      return a.localeCompare(b);
    });

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path
      .relative(path.resolve(__dirname, '../../'), filePath)
      .split(path.sep)
      .join('/');

    if (stat.isDirectory()) {
      const children = walkDir(filePath);
      if (children.length > 0) {
        items.push({
          text: formatText(file),
          items: children,
          collapsible: true,
          collapsed: false,
        });
      }
    } else if (file.endsWith('.md') && file !== 'README.md') {
      items.push({
        text: formatText(file.replace('.md', '')),
        link: `/${relativePath.replace('.md', '')}`,
      });
    }
  });

  return items;
}

function formatText(text: string): string {
  return text
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
