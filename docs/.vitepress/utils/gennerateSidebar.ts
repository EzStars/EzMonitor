import fs from 'fs';
import path from 'path';

interface SidebarItem {
  text: string;
  items?: SidebarItem[];
  link?: string;
  collapsible?: boolean;
  collapsed?: boolean;
}

const EXCLUDE_FILES = [
  '.vitepress',
  'node_modules',
  '.git',
  'public',
  'assets',
];

export function generateSidebar(): SidebarItem[] {
  const docsPath = path.resolve(__dirname, '../../');
  const items: SidebarItem[] = [];

  // 读取docs目录
  const files = fs
    .readdirSync(docsPath)
    .filter(file => !EXCLUDE_FILES.includes(file))
    .sort((a, b) => {
      // 目录优先，同类型按字母排序
      const aStats = fs.statSync(path.join(docsPath, a));
      const bStats = fs.statSync(path.join(docsPath, b));
      if (aStats.isDirectory() && !bStats.isDirectory()) return -1;
      if (!aStats.isDirectory() && bStats.isDirectory()) return 1;
      return a.localeCompare(b);
    });

  files.forEach(file => {
    const filePath = path.join(docsPath, file);
    const stat = fs.statSync(filePath);

    // 忽略以.开头的文件和README.md
    if (file.startsWith('.') || file === 'README.md') {
      return;
    }

    if (stat.isDirectory()) {
      const children = walkDir(filePath);
      // 只有当目录非空时才添加
      if (children.length > 0) {
        items.push({
          text: formatText(file),
          items: children,
          collapsible: true,
          collapsed: false,
        });
      }
    } else if (file.endsWith('.md')) {
      items.push({
        text: formatText(file.replace('.md', '')),
        link: `/${file.replace('.md', '')}`,
      });
    }
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
  // 将文件名转换为更友好的显示文本
  return text
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
