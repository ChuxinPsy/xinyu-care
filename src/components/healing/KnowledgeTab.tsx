import { Award, Bookmark,
  BookOpen, Clock, Eye, FileText, Play, Search, Sparkles, ThumbsUp,
  TrendingUp, Video, Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ContentDetailDialog from '@/components/healing/ContentDetailDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  getHealingContents,
  getUserFavorites,
  incrementLikeCount,
  toggleFavorite,
} from '@/db/api';
import type { HealingContent } from '@/types';

const CONTENT_TYPES = [
  { id: 'all', label: '全部', icon: BookOpen, gradient: 'from-violet-500 to-fuchsia-500' },
  { id: 'article', label: '文章', icon: FileText, gradient: 'from-sky-500 to-cyan-500' },
  { id: 'video', label: '视频', icon: Video, gradient: 'from-rose-500 to-pink-500' },
];

const TYPE_ICONS: Record<string, any> = {
  article: FileText,
  video: Video,
};

const TYPE_COLORS: Record<string, string> = {
  article: 'from-sky-500 to-cyan-500',
  video: 'from-rose-500 to-pink-500',
};

// 视频缩略图组件 - 自动提取视频第一帧作为封面
interface VideoThumbnailCardProps {
  thumbnailUrl?: string;
  videoUrl?: string;
  title: string;
  duration?: number;
  isPopular: boolean;
}

function VideoThumbnailCard({ thumbnailUrl, videoUrl, title, duration, isPopular }: VideoThumbnailCardProps) {
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!thumbnailUrl && !!videoUrl);

  useEffect(() => {
    // 如果有上传的封面，直接使用
    if (thumbnailUrl) return;

    // 如果没有上传封面但有视频URL，提取第一帧
    if (videoUrl) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // 跳转到第一帧
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setGeneratedThumbnail(dataUrl);
          }
        } catch (error) {
          console.error('生成视频缩略图失败:', error);
        }
        setIsLoading(false);
      };

      video.onerror = () => {
        console.error('视频加载失败:', videoUrl);
        setIsLoading(false);
      };

      // 设置超时，防止视频一直加载
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [thumbnailUrl, videoUrl]);

  // 优先使用上传的封面，其次是生成的第一帧，最后是渐变背景
  const displayThumbnail = thumbnailUrl || generatedThumbnail;

  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* 视频封面图片 */}
      {displayThumbnail ? (
        <img
          src={displayThumbnail}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : null}

      {/* 暗色遮罩层 */}
      <div className="absolute inset-0 bg-black/30" />

      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 视频图标背景 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* 装饰圆环 */}
          <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-white/10 scale-125 animate-pulse" style={{ animationDelay: '0.5s' }} />

          {/* 播放按钮 */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-rose-500/50 group-hover:scale-110 transition-transform duration-300">
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>

      {/* 视频标题覆盖层 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
        <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
          <Video className="w-3 h-3" />
          <span>视频内容</span>
          {duration && duration > 0 && (
            <>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{Math.floor(duration / 60)}分钟</span>
            </>
          )}
        </div>
      </div>

      {/* 热门标签 */}
      {isPopular && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg text-xs">
            <Zap className="w-3 h-3 mr-1" fill="currentColor" />
            热门
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeTab() {
  const { user } = useAuth();
  const [contents, setContents] = useState<HealingContent[]>([]);
  const [filteredContents, setFilteredContents] = useState<HealingContent[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'latest'>('all');
  const [selectedContent, setSelectedContent] = useState<HealingContent | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterContents();
  }, [selectedType, searchQuery, contents, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contentsData, favoritesData] = await Promise.all([
        getHealingContents(),
        user ? getUserFavorites(user.id) : Promise.resolve([]),
      ]);
      
      // 过滤出知识库内容（仅文章和视频，排除音频）
      const knowledgeContents = contentsData.filter(c =>
        c.content_type === 'article' || c.content_type === 'video'
      );
      
      setContents(knowledgeContents);
      setFavorites(new Set(favoritesData.map((f: any) => f.content_id)));
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const filterContents = () => {
    let filtered = [...contents];

    // 类型筛选
    if (selectedType !== 'all') {
      filtered = filtered.filter(c => c.content_type === selectedType);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) || 
        c.description?.toLowerCase().includes(query) ||
        c.author?.toLowerCase().includes(query)
      );
    }

    // Tab筛选
    if (activeTab === 'trending') {
      filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (activeTab === 'latest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredContents(filtered);
  };

  const handleToggleFavorite = async (contentId: string) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      const isFav = await toggleFavorite(user.id, contentId);
      setFavorites(prev => {
        const newSet = new Set(prev);
        isFav ? newSet.add(contentId) : newSet.delete(contentId);
        return newSet;
      });
      toast.success(isFav ? '已添加到收藏' : '已取消收藏');
    } catch (error) {
      console.error('收藏失败:', error);
      toast.error('操作失败');
    }
  };

  const handleContentClick = async (content: HealingContent) => {
    setSelectedContent(content);
    setDetailDialogOpen(true);
  };

  const handleLike = async (contentId: string) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      await incrementLikeCount(contentId);
      // 更新本地状态
      setContents(prevContents => 
        prevContents.map(content => 
          content.id === contentId 
            ? { ...content, like_count: (content.like_count || 0) + 1 }
            : content
        )
      );
      toast.success('点赞成功');
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
    }
  };

  const getTypeIcon = (type: string) => {
    return TYPE_ICONS[type] || BookOpen;
  };

  const getTypeGradient = (type: string) => {
    return TYPE_COLORS[type] || 'from-gray-500 to-gray-600';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选区域 */}
      <Card className="glass border-0 shadow-xl overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-green-500/15" />
        <CardContent className="relative p-6 space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="搜索内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base bg-background/50 border-border focus:border-primary/50 transition-all duration-300 rounded-2xl"
            />
          </div>

          {/* 类型筛选 */}
          <div className="flex flex-nowrap gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;

              return (
                <Button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`rounded-full px-4 sm:px-6 py-5 sm:py-6 text-sm sm:text-base font-medium transition-all duration-300 flex-shrink-0 ${
                    isSelected
                      ? `bg-gradient-to-r ${type.gradient} text-white shadow-glow scale-105`
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted/80 hover:scale-105 ring-1 ring-border backdrop-blur'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab切换 */}
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Button
          onClick={() => setActiveTab('all')}
          className={`flex-1 rounded-full py-6 text-base font-medium transition-all duration-300 ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-glow'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted/80 ring-1 ring-border backdrop-blur'
          }`}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          推荐
        </Button>
        <Button
          onClick={() => setActiveTab('trending')}
          className={`flex-1 rounded-full py-6 text-base font-medium transition-all duration-300 ${
            activeTab === 'trending'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-glow'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted/80 ring-1 ring-border backdrop-blur'
          }`}
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          热门
        </Button>
        <Button
          onClick={() => setActiveTab('latest')}
          className={`flex-1 rounded-full py-6 text-base font-medium transition-all duration-300 ${
            activeTab === 'latest'
              ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-glow'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted/80 ring-1 ring-border backdrop-blur'
          }`}
        >
          <Clock className="w-5 h-5 mr-2" />
          最新
        </Button>
      </div>

      {/* 内容列表 - 卡片式布局，每行2个 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : filteredContents.length === 0 ? (
          <Card className="col-span-full glass border-border shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">没有找到相关内容</p>
              <p className="text-sm text-muted-foreground mt-2">试试其他关键词或筛选条件</p>
            </CardContent>
          </Card>
        ) : (
          filteredContents.map((content, index) => {
            const Icon = getTypeIcon(content.content_type || 'article');
            const gradient = getTypeGradient(content.content_type || 'article');
            const isFavorited = favorites.has(content.id);
            const isPopular = (content.view_count || 0) > 1000;

            return (
              <Card
                key={content.id}
                className="glass shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-border cursor-pointer animate-fade-in-up group flex flex-col overflow-hidden"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleContentClick(content)}
              >
                {/* 视频封面区域 */}
                {content.content_type === 'video' && (
                  <VideoThumbnailCard
                    thumbnailUrl={content.thumbnail_url}
                    videoUrl={content.content_url}
                    title={content.title}
                    duration={content.duration}
                    isPopular={isPopular}
                  />
                )}

                <CardContent className="p-5 flex flex-col flex-1">
                  {/* 文章类型显示图标和标签 */}
                  {content.content_type === 'article' && (
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-glow group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isPopular && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-glow text-xs">
                            <Zap className="w-3 h-3 mr-1" fill="currentColor" />
                            热门
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`bg-gradient-to-r ${gradient} text-white border-0 text-xs`}
                        >
                          文章
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* 标题 */}
                  <h3 className={`text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2 ${content.content_type === 'video' ? '' : 'min-h-[56px]'}`}>
                    {content.title}
                  </h3>

                  {/* 描述 */}
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4 mb-4 flex-1 min-h-[80px]">
                    {content.description}
                  </p>

                  {/* 元信息 */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-4">
                    {content.author && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {content.author}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(content.view_count || 0)}
                    </span>
                    {content.content_type === 'article' && content.duration && content.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(content.duration / 60)}分钟
                      </span>
                    )}
                  </div>

                  {/* 操作栏 */}
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(content.id);
                        }}
                        className="text-muted-foreground hover:text-pink-500 transition-all duration-300 hover:scale-110 group/like h-8 px-2"
                      >
                        <ThumbsUp className="w-4 h-4 mr-1 group-hover/like:fill-current" />
                        <span className="text-xs font-medium">{content.like_count || 0}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-blue-500 transition-all duration-300 hover:scale-110 group/play h-8 px-2"
                      >
                        <Play className="w-4 h-4 mr-1 group-hover/play:fill-current" />
                        <span className="text-xs">{content.content_type === 'article' ? '阅读' : '观看'}</span>
                      </Button>
                    </div>

                    {/* 收藏按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(content.id);
                      }}
                      className={`transition-all duration-300 hover:scale-110 h-8 px-2 ${
                        isFavorited
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-muted-foreground hover:text-amber-500'
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 底部提示 */}
      {!loading && filteredContents.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>持续学习,不断成长</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs">已加载 {filteredContents.length} 条内容</p>
        </div>
      )}

      {/* 详情弹窗 */}
      <ContentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        content={selectedContent}
        type="knowledge"
        onUpdate={loadData}
      />


    </div>
  );
}
