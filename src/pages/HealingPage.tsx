import { Clock, Eye, Heart as HeartIcon, MessageCircle, Play, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createCommunityPost, createHealingRecord, getCommunityPosts, getHealingContents, togglePostLike } from '@/db/api';
import type { CommunityPost, HealingContent } from '@/types';

export default function HealingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<HealingContent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [healingData, postsData] = await Promise.all([
        getHealingContents(),
        getCommunityPosts(20),
      ]);
      setContents(healingData);
      setPosts(postsData);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayContent = async (content: HealingContent) => {
    if (!user) return;
    try {
      await createHealingRecord({
        user_id: user.id,
        healing_content_id: content.id,
        completed: false,
      });
      toast.success(`开始播放: ${content.title}`);
      // 实际应用中这里应该打开音频播放器
    } catch (error) {
      console.error('播放失败:', error);
      toast.error('播放失败');
    }
  };

  const handleCreatePost = async () => {
    if (!user || !postTitle.trim() || !postContent.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    try {
      const anonymousName = `用户${Math.random().toString(36).substring(2, 8)}`;
      await createCommunityPost({
        user_id: user.id,
        anonymous_name: anonymousName,
        title: postTitle,
        content: postContent,
      });
      toast.success('发布成功');
      setPostTitle('');
      setPostContent('');
      setPostDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error('发布失败:', error);
      toast.error('发布失败');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    try {
      await togglePostLike(postId, user.id);
      await loadData();
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const filteredContents = selectedCategory === 'all'
    ? contents
    : contents.filter(c => c.category === selectedCategory);

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'meditation', label: '冥想' },
    { value: 'sleep', label: '睡眠' },
    { value: 'focus', label: '专注' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部标题 */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center">
            <HeartIcon className="w-6 h-6 mr-2" />
            疗愈空间
          </h1>
          <p className="text-primary-foreground/90 mt-1">放松身心,温暖陪伴</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-4">
        <Tabs defaultValue="healing" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="healing">疗愈内容</TabsTrigger>
            <TabsTrigger value="community">互助树洞</TabsTrigger>
          </TabsList>

          {/* 疗愈内容 */}
          <TabsContent value="healing" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredContents.map((content) => (
                  <Card key={content.id} className="overflow-hidden">
                    <div className="flex">
                      <div
                        className="w-24 h-24 bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url(${content.thumbnail_url})` }}
                      />
                      <div className="flex-1 p-4">
                        <h3 className="font-semibold mb-1">{content.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                          {content.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {Math.floor((content.duration || 0) / 60)}分钟
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {content.view_count}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handlePlayContent(content)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            播放
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 互助树洞 */}
          <TabsContent value="community" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">匿名分享,温暖陪伴</p>
              <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    发帖
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>发布帖子(匿名)</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="post-title">标题</Label>
                      <Input
                        id="post-title"
                        placeholder="给帖子起个标题"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="post-content">内容</Label>
                      <Textarea
                        id="post-content"
                        placeholder="分享你的故事和感受..."
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        rows={6}
                      />
                    </div>
                    <Button onClick={handleCreatePost} className="w-full">
                      发布
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{post.title}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{post.anonymous_name}</span>
                            <span>·</span>
                            <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </div>
                        {post.is_pinned && (
                          <Badge variant="secondary">置顶</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikePost(post.id)}
                        >
                          <HeartIcon className="w-4 h-4 mr-1" />
                          {post.like_count}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {post.comment_count}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
