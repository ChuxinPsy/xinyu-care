import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Bookmark,
  Clock,
  Copy,
  Eye,
  FileText,
  Heart,
  Link2,
  MessageCircle,
  Play,
  Send,
  Share2,
  ThumbsUp,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  createCommunityComment,
  getCommunityComments,
  incrementLikeCount,
  incrementViewCount,
  toggleFavorite,
  togglePostLike,
} from '@/db/api';
import type { CommunityPost, HealingContent } from '@/types';

interface ContentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: HealingContent | CommunityPost | null;
  type: 'healing' | 'community' | 'knowledge';
  onUpdate?: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  anonymous_name: string;
  content: string;
  like_count: number;
  created_at: string;
}

export default function ContentDetailDialog({
  open,
  onOpenChange,
  content,
  type,
  onUpdate,
}: ContentDetailDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // 视频播放相关状态
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && content) {
      loadData();
    }
  }, [open, content]);

  const loadData = async () => {
    if (!content) return;
    setLoading(true);
    try {
      // 增加浏览量
      if (type === 'knowledge') {
        await incrementViewCount(content.id);
      }

      // 加载评论（仅树洞和知识库）
      if (type === 'community' || type === 'knowledge') {
        const commentsData = await getCommunityComments(content.id);
        setComments(commentsData);
        setCommentCount(commentsData.length);
      }

      // 初始化点赞和收藏状态
      if ('like_count' in content) {
        setLikeCount(content.like_count || 0);
      }
      if ('view_count' in content) {
        setViewCount(content.view_count || 0);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !content) {
      toast.error('请先登录');
      return;
    }

    try {
      if (type === 'community') {
        const liked = await togglePostLike(content.id, user.id);
        setIsLiked(liked);
        setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
        toast.success(liked ? '点赞成功' : '已取消点赞');
      } else if (type === 'knowledge' || type === 'healing') {
        await incrementLikeCount(content.id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        toast.success('点赞成功');
      }
      onUpdate?.();
    } catch (error) {
      console.error('点赞失败:', error);
      toast.error('操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!user || !content) {
      toast.error('请先登录');
      return;
    }

    try {
      const favorited = await toggleFavorite(user.id, content.id);
      setIsFavorited(favorited);
      toast.success(favorited ? '已添加到收藏' : '已取消收藏');
      onUpdate?.();
    } catch (error) {
      console.error('收藏失败:', error);
      toast.error('操作失败');
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !content) {
      toast.error('请先登录');
      return;
    }

    if (!newComment.trim()) {
      toast.error('请输入评论内容');
      return;
    }

    setSubmitting(true);
    try {
      const anonymousName = `用户${Math.random().toString(36).substring(2, 8)}`;
      await createCommunityComment({
        post_id: content.id,
        user_id: user.id,
        anonymous_name: anonymousName,
        content: newComment,
      });

      setNewComment('');
      toast.success('评论成功');
      await loadData();
      setCommentCount(prev => prev + 1);
      onUpdate?.();
    } catch (error) {
      console.error('评论失败:', error);
      toast.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleCopyLink = () => {
    if (!content) return;
    const url = `${window.location.origin}/healing/${type}/${content.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('链接已复制到剪贴板');
      setShareDialogOpen(false);
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      'from-pink-400 to-rose-500',
      'from-purple-400 to-indigo-500',
      'from-blue-400 to-cyan-500',
      'from-green-400 to-emerald-500',
      'from-amber-400 to-orange-500',
    ];
    return gradients[index % gradients.length];
  };

  // 视频播放控制函数
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleVideoClick = () => {
    togglePlay();
    // 显示控制栏
    setShowVideoControls(true);
    // 清除之前的定时器
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // 3秒后隐藏控制栏
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowVideoControls(false);
      }
    }, 3000);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 判断内容类型
  const isKnowledgeContent = type === 'knowledge' && content && 'content_type' in content;
  const contentType = isKnowledgeContent ? (content as HealingContent).content_type : null;
  const contentUrl = isKnowledgeContent ? (content as HealingContent).content_url : null;

  if (!content) return null;

  const title = 'title' in content ? content.title : '';
  const description = 'description' in content ? content.description : '';
  const author = 'author' in content ? content.author : '';
  const contentText = 'content' in content ? (content as CommunityPost).content : description;
  const createdAt = content.created_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0 overflow-hidden rounded-[24px] border-none bg-background shadow-2xl">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  {title}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                {author && (
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {author}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTimeAgo(createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {viewCount}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4 max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* 内容区域 */}
            <div className="space-y-4">
              {/* 视频播放器 */}
              {contentType === 'video' && contentUrl && (
                <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video group/video">
                  <video
                    ref={videoRef}
                    src={contentUrl}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={handleVideoClick}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    playsInline
                  />

                  {/* 播放按钮覆盖层 */}
                  {!isPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                      onClick={handleVideoClick}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* 视频控制栏 */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 transition-opacity duration-300 ${
                      showVideoControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {/* 进度条 */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white text-xs font-mono">{formatTime(currentTime)}</span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                      <span className="text-white text-xs font-mono">{formatTime(duration)}</span>
                    </div>

                    {/* 播放控制按钮 */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={togglePlay}
                        className="text-white hover:bg-white/20 h-8 px-2"
                      >
                        {isPlaying ? (
                          <div className="flex gap-0.5">
                            <div className="w-1 h-4 bg-white rounded-sm" />
                            <div className="w-1 h-4 bg-white rounded-sm" />
                          </div>
                        ) : (
                          <Play className="w-5 h-5" fill="currentColor" />
                        )}
                      </Button>

                      {/* 类型标签 */}
                      <Badge className="bg-rose-500/80 text-white border-0">
                        <Video className="w-3 h-3 mr-1" />
                        视频
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* 文章内容展示 */}
              {contentType === 'article' && (
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-sky-500 text-white border-0">
                    <FileText className="w-3 h-3 mr-1" />
                    文章
                  </Badge>
                </div>
              )}

              {/* 文本内容 */}
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="text-foreground leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                  {contentText}
                </div>
              </div>
            </div>

            {/* 互动按钮 */}
            <div className="flex items-center gap-4 py-4 border-y border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`transition-all duration-300 hover:scale-110 ${
                  isLiked
                    ? 'text-pink-500 hover:text-pink-600'
                    : 'text-muted-foreground hover:text-pink-500'
                }`}
              >
                <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likeCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-blue-500 transition-all duration-300 hover:scale-110"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">{commentCount}</span>
              </Button>

              {(type === 'knowledge' || type === 'healing') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavorite}
                  className={`transition-all duration-300 hover:scale-110 ${
                    isFavorited
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-muted-foreground hover:text-amber-500'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                  收藏
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-muted-foreground hover:text-green-500 transition-all duration-300 hover:scale-110 ml-auto"
              >
                <Share2 className="w-5 h-5 mr-2" />
                分享
              </Button>
            </div>

            {/* 评论区域 */}
            {(type === 'community' || type === 'knowledge') && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  评论 ({commentCount})
                </h3>

                {/* 评论输入框 */}
                <div className="space-y-3 p-4 rounded-2xl bg-muted/50 border border-border">
                  <Textarea
                    placeholder={type === 'community' ? '写下你的想法...(匿名评论)' : '写下你的想法...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="bg-background border-border focus:border-primary/50 transition-all resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {newComment.length}/500
                    </span>
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submitting}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg transition-all"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? '发送中...' : '发送'}
                    </Button>
                  </div>
                </div>

                {/* 评论列表 */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-muted-foreground mt-2 text-sm">加载中...</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>还没有评论,快来抢沙发吧!</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {comments.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarFallback
                              className={`bg-gradient-to-br ${getAvatarGradient(index)} text-white font-semibold`}
                            >
                              {comment.anonymous_name?.charAt(2) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground text-sm">
                                {comment.anonymous_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {comment.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-pink-500"
                              >
                                <Heart className="w-3 h-3 mr-1" />
                                {comment.like_count || 0}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* 分享弹窗 */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-[20px] border-none bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              分享到
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              选择一种分享方式
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* 复制链接 */}
            <Button
              onClick={handleCopyLink}
              className="w-full justify-start h-14 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-950/50 dark:hover:to-cyan-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                <Copy className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold">复制链接</div>
                <div className="text-xs opacity-70">将链接分享给好友</div>
              </div>
            </Button>

            {/* 微信分享 */}
            <Button
              onClick={() => {
                toast.info('请在微信中打开此页面进行分享');
                setShareDialogOpen(false);
              }}
              className="w-full justify-start h-14 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-950/50 dark:hover:to-emerald-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mr-3">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold">微信好友</div>
                <div className="text-xs opacity-70">分享到微信好友或群</div>
              </div>
            </Button>

            {/* 生成海报 */}
            <Button
              onClick={() => {
                toast.info('海报生成功能开发中...');
                setShareDialogOpen(false);
              }}
              className="w-full justify-start h-14 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-950/50 dark:hover:to-pink-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold">生成海报</div>
                <div className="text-xs opacity-70">生成精美图片分享</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
