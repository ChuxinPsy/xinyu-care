import { Bell, Clock, Heart, MessageCircle, Moon, Music, Pause, Play, Send, Settings, SkipBack, SkipForward, ThumbsUp, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createCommunityPost, getCommunityPosts, getHealingContents, togglePostLike } from '@/db/api';
import type { CommunityPost, HealingContent } from '@/types';

const MEDITATION_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'breathing', label: '呼吸' },
  { id: 'relax', label: '放松' },
  { id: 'sleep', label: '睡眠' },
];

const CONTENT_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-purple-500 to-purple-600',
  'from-blue-500 to-blue-600',
  'from-pink-500 to-pink-600',
  'from-amber-500 to-amber-600',
];

export default function HealingPageNew() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('meditation');
  const [activeCategory, setActiveCategory] = useState('all');
  const [healingContent, setHealingContent] = useState<HealingContent[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<HealingContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(45);
  const [totalTime] = useState(300);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    loadData();
  }, [activeCategory]);

  useEffect(() => {
    if (healingContent.length > 0 && !selectedContent) {
      setSelectedContent(healingContent[0]);
    }
  }, [healingContent]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contentData, postsData] = await Promise.all([
        getHealingContents(activeCategory === 'all' ? undefined : activeCategory),
        getCommunityPosts(20),
      ]);
      setHealingContent(contentData);
      setCommunityPosts(postsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayContent = (content: HealingContent) => {
    setSelectedContent(content);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleCreatePost = async () => {
    if (!user || !newPost.trim()) {
      toast.error('请输入内容');
      return;
    }
    try {
      await createCommunityPost({
        user_id: user.id,
        content: newPost,
        title: newPost.slice(0, 50),
      });
      setNewPost('');
      toast.success('发布成功');
      await loadData();
    } catch (error) {
      console.error('发布失败:', error);
      toast.error('发布失败');
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      await togglePostLike(postId, user.id);
      await loadData();
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <span className="text-xl font-semibold text-foreground">疗愈</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* 标题区域 */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">疗愈空间</h1>
          <p className="text-muted-foreground text-sm tracking-wider">HEALING & MINDSET SANCTUARY</p>
        </div>

        {/* Tab切换 */}
        <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={() => setActiveTab('meditation')}
            className={`flex-1 rounded-full py-6 text-base font-medium transition-smooth ${
              activeTab === 'meditation'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow hover:opacity-90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            冥想
          </Button>
          <Button
            onClick={() => setActiveTab('knowledge')}
            className={`flex-1 rounded-full py-6 text-base font-medium transition-smooth ${
              activeTab === 'knowledge'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow hover:opacity-90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            知识
          </Button>
          <Button
            onClick={() => setActiveTab('community')}
            className={`flex-1 rounded-full py-6 text-base font-medium transition-smooth ${
              activeTab === 'community'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow hover:opacity-90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            树洞
          </Button>
        </div>

        {/* 冥想Tab内容 */}
        {activeTab === 'meditation' && (
          <div className="space-y-6">
            {/* 主播放器 */}
            <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-0 shadow-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-8 md:p-12">
                {/* 正在播放标签 */}
                <div className="flex justify-center mb-6">
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 px-4 py-1.5 text-sm">
                    正在播放
                  </Badge>
                </div>

                {/* 标题 */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {selectedContent?.title || '5分钟呼吸导引'}
                  </h2>
                  <p className="text-indigo-300 text-sm">
                    {selectedContent?.description || '跟随圆圈来缓呼吸'}
                  </p>
                </div>

                {/* 呼吸动画圆形 */}
                <div className="flex justify-center mb-12">
                  <div className="relative w-64 h-64">
                    {/* 外圈波纹 */}
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-breathe" />
                    <div className="absolute inset-4 rounded-full border-2 border-indigo-500/30 animate-breathe" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute inset-8 rounded-full border-2 border-indigo-500/40 animate-breathe" style={{ animationDelay: '1s' }} />
                    
                    {/* 中心圆 */}
                    <div className="absolute inset-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-glow flex items-center justify-center animate-pulse-glow">
                      <Music className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between text-sm text-indigo-300 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(totalTime)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${(currentTime / totalTime) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 播放控制 */}
                <div className="flex items-center justify-center gap-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 text-indigo-300 hover:text-white hover:bg-slate-700/50 transition-smooth"
                  >
                    <SkipBack className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 shadow-2xl transition-smooth"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-slate-900" fill="currentColor" />
                    ) : (
                      <Play className="w-10 h-10 text-slate-900 ml-1" fill="currentColor" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12 text-indigo-300 hover:text-white hover:bg-slate-700/50 transition-smooth"
                  >
                    <SkipForward className="w-6 h-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 统计数据 */}
            <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Card className="glass border-border shadow-sm card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">128</div>
                  <div className="text-sm text-muted-foreground">分钟总计</div>
                </CardContent>
              </Card>

              <Card className="glass border-border shadow-sm card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">12</div>
                  <div className="text-sm text-muted-foreground">练习天数</div>
                </CardContent>
              </Card>

              <Card className="glass border-border shadow-sm card-hover">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Moon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">4.5</div>
                  <div className="text-sm text-muted-foreground">平均评分</div>
                </CardContent>
              </Card>
            </div>

            {/* 冥想库 */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xl font-bold text-foreground">冥想库</h3>
              </div>

              {/* 分类Tab */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {MEDITATION_CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-full px-6 py-2 text-sm font-medium whitespace-nowrap transition-smooth ${
                      activeCategory === cat.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* 冥想列表 */}
              <div className="space-y-3">
                {healingContent.slice(0, 4).map((content, index) => {
                  const gradient = CONTENT_GRADIENTS[index % CONTENT_GRADIENTS.length];
                  const isActive = selectedContent?.id === content.id;
                  
                  return (
                    <Card
                      key={content.id}
                      onClick={() => handlePlayContent(content)}
                      className={`cursor-pointer transition-smooth hover:shadow-lg ${
                        isActive
                          ? 'border-2 border-indigo-500 shadow-glow bg-indigo-50/50 dark:bg-indigo-500/10'
                          : 'border border-border hover:border-indigo-300'
                      }`}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 播放按钮 */}
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                          </div>
                          
                          {/* 信息 */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-1">{content.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {content.category} • {content.duration ? `${Math.floor(content.duration / 60)}:00` : '5:00'}
                            </p>
                          </div>
                        </div>

                        {/* 音量图标 */}
                        {isActive && (
                          <Volume2 className="w-5 h-5 text-indigo-600 animate-pulse" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 知识Tab内容 */}
        {activeTab === 'knowledge' && (
          <Card className="glass border-primary/20 shadow-sm animate-fade-in-up">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center mx-auto mb-4 animate-float">
                <Music className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">知识库功能</h3>
              <p className="text-muted-foreground">即将上线,敬请期待</p>
            </CardContent>
          </Card>
        )}

        {/* 树洞Tab内容 */}
        {activeTab === 'community' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* 发布区域 */}
            <Card className="glass border-primary/20 shadow-sm">
              <CardContent className="p-6">
                <Textarea
                  placeholder="分享你的感受和经验..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                  className="mb-4 bg-background border-border focus:border-primary/50 transition-smooth"
                />
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPost.trim()}
                  className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90 text-white shadow-glow transition-smooth"
                >
                  <Send className="w-4 h-4 mr-2" />
                  发布
                </Button>
              </CardContent>
            </Card>

            {/* 帖子列表 */}
            <div className="space-y-4">
              {communityPosts.map((post, index) => (
                <Card
                  key={post.id}
                  className="glass border-border shadow-sm hover:border-primary/30 card-hover animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center flex-shrink-0 shadow-glow">
                        <span className="text-white font-semibold">U</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">匿名用户</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <p className="text-foreground leading-relaxed">{post.content}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        {post.like_count || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        评论
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
