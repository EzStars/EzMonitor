---
layout: page
---
<script setup>
import {
  VPTeamPage,
  VPTeamPageTitle,
  VPTeamMembers
} from 'vitepress/theme'

const members = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/146628596?v=4',
    name: 'Ni0duann',
    title: '💻 Frontend Developer',
    links: [
      { icon: 'github', link: 'https://github.com/Ni0duann' },
    //   { icon: 'twitter', link: 'https://twitter.com/youyuxi' }
    ]
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/109895777?v=4',
    name: 'Zero1017',
    title: '🎨 Frontend Designer',
    links: [
      { icon: 'github', link: 'https://github.com/Eomnational' }
    ]
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/122375177?v=4',
    name: 'zihuv',
    title: '🛠️ Backend Developer',
    links: [
      { icon: 'github', link: 'https://github.com/zihuv' }
    ]
  },
    {
    avatar: 'https://avatars.githubusercontent.com/u/126047472?v=4',
    name: 'fzr365',
    title: '🛠️ Backend Developer',
    links: [
      { icon: 'github', link: 'https://github.com/fzr365' }
    ]
  },
      {
    avatar: 'https://avatars.githubusercontent.com/u/128409343?v=4',
    name: 'wenhuilan',
    title: '🍃 Frontend Developer',
    links: [
      { icon: 'github', link: 'https://github.com/wenhuilan' }
    ]
  }
  // 可以继续添加更多成员
]
</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>
      关于EzStars团队
    </template>
    <template #lead>
      EzMonitor 由一群充满热情的在读大学生开发者构建，以下是我们的核心团队成员。
    </template>
  </VPTeamPageTitle>
  <VPTeamMembers
    :members="members"
  />
</VPTeamPage>