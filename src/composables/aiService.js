const AI_PROMPTS = {
  daily: [
    '请根据以下信息帮我写一篇今天的日记：{info}。要求：语气自然、情感真挚，像真人写的日记一样，约300字。',
    '今天是{date}，请根据这些内容帮我生成一篇日记：{info}。风格温暖自然，有个人感受和思考。',
    '帮我写一篇今天的日记。相关信息：{info}。要求文字流畅，有温度，约300-500字。'
  ],
  mood: {
    happy: '今天心情很好，',
    calm: '今天很平静，',
    excited: '今天很兴奋，',
    sad: '今天有些难过，',
    anxious: '今天有些焦虑，',
    tired: '今天很累，'
  },
  weather: {
    sunny: '天气晴朗，',
    cloudy: '天气多云，',
    rainy: '下雨了，',
    snowy: '下雪了，'
  }
}

const SAMPLE_DIARIES = {
  default: `今天是忙碌而充实的一天。

早上起床后，泡了一杯咖啡，坐在窗边看了一会儿外面的风景。阳光透过树叶洒进来，斑驳的光影让人心情很好。

上午处理了一些工作上的事情，虽然有些琐碎，但都一一搞定了。中午和同事一起吃了饭，聊了很多有趣的话题，笑得很开心。

下午继续工作，效率比预期高了不少。下班回家的路上，看到路边新开了一家花店，买了一束向日葵带回家。看着桌上的花，感觉生活里的小美好就在这些细节里。

晚上做了一顿简单的晚餐，饭后看了一部电影。虽然是部老片子，但还是很打动人。

一天就这样过去了，平淡但有温度。希望明天也能这样，在平凡的日子里找到属于自己的小确幸。`,

  travel: `今天去了一直想去的地方。

一路上风景很美，窗外的山峦和田野像一幅流动的画。到达目的地后，第一感觉是比想象中还要美。

走在石板路上，两边是古朴的建筑，偶尔有当地居民骑着自行车经过，那种悠闲的生活节奏让人羡慕。找了一家小店吃了午饭，味道出乎意料地好。

最难忘的是傍晚时分，夕阳把天空染成了橘红色，整个小镇都笼罩在金色的光晕里。那一刻觉得，有些风景真的值得亲自去看。

回来的路上有些疲惫，但心里满满的。旅行就是这样，身体在路上，心也在路上。`,

  work: `今天工作上有了新进展。

早上开了一个很重要的会议，讨论接下来的项目计划。大家各抒己见，碰撞出了不少好想法。我被分配了一个有挑战性的任务，虽然有些压力，但更多的是期待。

下午开始着手准备，查阅了很多资料，也向有经验的同事请教了一些问题。渐渐地，思路越来越清晰，对要做的事情也有了更明确的方向。

下班的时候，看着电脑屏幕上初步成型的方案，有一种小小的成就感。虽然离完成还有很长的路要走，但至少已经迈出了第一步。

工作就是这样，每一天都在前进，哪怕只是一小步。`
}

export async function generateDiary(options = {}) {
  const {
    mood = '',
    weather = '',
    events = '',
    style = 'default',
    apiKey = '',
    model = ''
  } = options

  // Build context info
  let contextParts = []
  if (mood && AI_PROMPTS.mood[mood]) contextParts.push(AI_PROMPTS.mood[mood])
  if (weather && AI_PROMPTS.weather[weather]) contextParts.push(AI_PROMPTS.weather[weather])
  if (events) contextParts.push(events)
  
  const context = contextParts.join('') || '平平淡淡的一天'
  const dateStr = new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
  })

  // If API key provided, try real AI
  if (apiKey) {
    return await callRealAI(context, dateStr, style, apiKey, model)
  }

  // Fallback: use built-in templates
  await delay(1500 + Math.random() * 1000) // Simulate loading
  return SAMPLE_DIARIES[style] || SAMPLE_DIARIES.default
}

async function callRealAI(context, dateStr, style, apiKey, model) {
  try {
    const prompt = AI_PROMPTS.daily[0]
      .replace('{date}', dateStr)
      .replace('{info}', context)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一个温暖的日记作者。请用第一人称写一篇中文日记，语气自然真实，像在记录自己的生活。约300-500字。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    })

    if (!response.ok) throw new Error('API request failed')
    
    const data = await response.json()
    return data.choices[0].message.content
  } catch (e) {
    console.warn('AI API call failed, using template:', e)
    return SAMPLE_DIARIES[style] || SAMPLE_DIARIES.default
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
