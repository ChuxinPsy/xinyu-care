import { BookOpen, Edit, Plus, Search, Trash2, Eye, Copy, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createKnowledge, deleteKnowledge, getKnowledgeBase, updateKnowledge, uploadKnowledgeDocument, deleteKnowledgeDocument, getKnowledgeDocumentUrl } from '@/db/api';
import type { KnowledgeBase } from '@/types';

export default function KnowledgePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBase | null>(null);
  const [viewingQuestions, setViewingQuestions] = useState<{ title: string; questions: string[] } | null>(null);

  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('assessment');
  const [tags, setTags] = useState('');
  const [scaleQuestions, setScaleQuestions] = useState<{ id: string; text: string; order: number }[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);  // 待上传文件
  const [uploadProgress, setUploadProgress] = useState(0);  // 上传进度
  const [isUploading, setIsUploading] = useState(false);  // 是否正在上传

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeBase();

      const buildScale = (title: string, tag: string, description: string, questions: string[]) => ({
        title,
        content: JSON.stringify({
          type: 'scale',
          scale_id: tag,
          description,
          version: 1,
          questions: questions.map((t, i) => ({ id: crypto.randomUUID(), text: t, order: i }))
        }),
        category: 'assessment',
        tags: [tag, '量表', '评估量表'],
        created_by: user?.id || ''
      });

      const phq9Questions = [
        '兴趣减退：做事提不起劲或没有兴趣',
        '情绪低落：感到忧郁、沮丧或绝望',
        '睡眠问题：入睡困难、多梦、早醒或睡眠过多',
        '精力不足：感觉疲倦或没有体力',
        '食欲改变：食欲不振或暴饮暴食',
        '自我评价低：觉得自己很失败或让自己/家人失望',
        '注意力困难：很难集中注意力（如看电视/读报）',
        '精神运动改变：行动或说话变慢，或烦躁不安',
        '自伤/自杀意念：有轻生或自残的念头'
      ];

      const hamd17Questions = [
        '抑郁心境：过去一周大部分时间感到抑郁、悲伤',
        '罪疚感：对过往或现状有明显内疚或自责',
        '自杀意念：出现轻生或自伤想法与言语',
        '入睡困难：卧床后半小时以上不能入睡',
        '睡眠维持：夜间多次醒来且难以再入睡',
        '早醒：较平时更早醒且无法再睡',
        '工作/活动减少：工作效率下降或兴趣显著降低',
        '精神运动迟滞：动作、言语明显缓慢',
        '激越：烦躁不安，坐立不宁或来回走动',
        '焦虑（心理）：紧张、担忧、易紧张的主观体验',
        '焦虑（躯体）：心悸、出汗、手抖等躯体症状',
        '胃肠道症状：食欲下降、恶心或胃部不适',
        '全身躯体症状：头痛、乏力、身体不适',
        '性功能症状：性欲减退或相关问题',
        '疑病倾向：过度担心身体疾病',
        '体重下降：近期体重较以往明显减少',
        '洞察力：对自身病情的认识与配合程度'
      ];

      const sds20Questions = [
        '心境低落：我觉得心情不好，心里很难过',
        '早晨状态：我觉得早晨心情最好',
        '哭泣倾向：我要哭，或者想哭',
        '睡眠问题：我夜间睡眠不好',
        '食欲情况：我吃饭跟平时一样多',
        '人际愉悦：我跟异性接触时，和以往一样感到愉快',
        '体重变化：我发觉我的体重在下降',
        '便秘困扰：我有便秘的苦恼',
        '心率变化：我心跳比平时快',
        '疲乏感：我无缘无故地感到疲乏',
        '思维清晰度：我的头脑跟平时一样清楚',
        '做事难度：我觉得做任何事情都没有困难',
        '焦虑不安：我觉得不安而平静不下来',
        '未来期望：我对未来抱有希望',
        '易激惹：我比平时更容易激怒',
        '决策能力：我觉得决定什么事很容易',
        '自我价值：我觉得自已是个有用的人，有人需要我',
        '生活意义：我的生活很有意义',
        '自杀意念：我觉得如果我死了，别人会生活得更好',
        '兴趣保持：我仍然喜爱我平时喜爱的东西'
      ];

      const canonical: Record<string, string[]> = {
        'PHQ-9': phq9Questions,
        'HAMD-17': hamd17Questions,
        'SDS-20': sds20Questions,
      };

      const hasTag = (items: KnowledgeBase[], tag: string) => items.some(it => Array.isArray(it.tags) && it.tags.includes(tag));
      let list = Array.isArray(data) ? data.slice() : [];

      // Inject missing standard scales
      for (const tag of Object.keys(canonical)) {
        if (!hasTag(list, tag) && user) {
          const created = await createKnowledge(buildScale(
            tag === 'PHQ-9' ? 'PHQ-9 评估量表' : tag === 'HAMD-17' ? 'HAMD-17 汉密尔顿抑郁量表' : 'SDS-20 自评抑郁量表',
            tag,
            tag === 'PHQ-9' ? '抑郁筛查量表' : tag === 'HAMD-17' ? '临床评估抑郁状态的标准量表' : '自评抑郁量表',
            canonical[tag]
          ) as any);
          // 重新加载一次最新数据
          list = await getKnowledgeBase();
        }
      }

      // Normalize existing scales
      const normalize = async (item: KnowledgeBase) => {
        try {
          const j = JSON.parse(item.content || '{}');
          const tag = (item.tags || []).find(t => canonical[t]);
          if (j?.type === 'scale' && tag) {
            const desired = canonical[tag];
            const qs = Array.isArray(j.questions) ? j.questions.slice() : [];
            const sorted = qs.slice().sort((a: any,b: any) => (a.order??0)-(b.order??0));
            const looksPlaceholder = sorted.some((q: any) => /第\s*\d+\s*题/.test(q?.text || ''));
            const needFix = looksPlaceholder || sorted.length !== desired.length;
            if (needFix) {
              const newContent = JSON.stringify({
                type: 'scale',
                scale_id: tag,
                description: j.description || (tag === 'PHQ-9' ? '抑郁筛查量表' : tag === 'HAMD-17' ? '临床评估抑郁状态的标准量表' : '自评抑郁量表'),
                version: j.version || 1,
                questions: desired.map((t, i) => ({ id: sorted[i]?.id || crypto.randomUUID(), text: t, order: i }))
              });
              await updateKnowledge(item.id, { content: newContent });
            } else if (!j.scale_id) {
              // 已有正确题目但缺少 scale_id，补充写入
              const newContent = JSON.stringify({ ...j, scale_id: tag });
              await updateKnowledge(item.id, { content: newContent });
            }
          }
        } catch {}
      };

      for (const it of list) {
        await normalize(it);
      }

      setKnowledge(await getKnowledgeBase());
    } catch (error) {
      console.error('加载知识库失败:', error);
      toast.error('加载知识库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: KnowledgeBase) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setContent(item.content);
      setCategory(item.category);
      setTags(item.tags?.join(', ') || '');
      if (item.category === 'assessment') {
        try {
          const j = JSON.parse(item.content || '{}');
          const qs = Array.isArray(j.questions) ? j.questions.slice().sort((a: any,b: any) => (a.order??0)-(b.order??0)) : [];
          setScaleQuestions(qs.map((q: any, i: number) => ({ id: q.id || crypto.randomUUID(), text: q.text || '', order: q.order ?? i })));
        } catch { setScaleQuestions([]); }
      } else {
        setScaleQuestions([]);
      }
    } else {
      setEditingItem(null);
      setTitle('');
      setContent('');
      setCategory('assessment');
      setTags('');
      setScaleQuestions([]);
    }
    setUploadingFile(null);  // 清空上传文件
    setUploadProgress(0);  // 重置上传进度
    setIsUploading(false);  // 重置上传状态
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error('请填写标题');
      return;
    }

    try {
      let knowledgeData: any = {
        title,
        category,
        created_by: user.id,
      };

      // 文档类型处理：therapy或research分类且有上传文件
      if ((category === 'therapy' || category === 'research') && uploadingFile) {
        setIsUploading(true);
        setUploadProgress(0);
        
        // 模拟上传进度（因为Supabase Storage上传不支持原生进度回调）
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        try {
          const uploadResult = await uploadKnowledgeDocument(uploadingFile, category);
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          knowledgeData = {
            ...knowledgeData,
            content_type: 'document',
            file_url: uploadResult.path,
            file_name: uploadResult.name,
            file_size: uploadResult.size,
            file_mime_type: uploadResult.type,
            content: content.trim() || `文档: ${uploadResult.name}`,
          };
        } catch (error) {
          clearInterval(progressInterval);
          setIsUploading(false);
          setUploadProgress(0);
          throw error;
        }
      } 
      // 量表类型处理
      else if (category === 'assessment') {
        const inferTag = () => {
          if (/PHQ-9/i.test(title)) return 'PHQ-9';
          if (/HAMD-17/i.test(title)) return 'HAMD-17';
          if (/SDS-20/i.test(title)) return 'SDS-20';
          return undefined;
        };
        const inferred = inferTag();
        const tagsArray = editingItem?.tags ?? ([...(inferred ? [inferred] : []), '量表', '评估量表']);
        
        knowledgeData.content = JSON.stringify({
          type: 'scale',
          description: title,
          version: 1,
          questions: scaleQuestions.map((q, i) => ({ id: q.id, text: q.text, order: i }))
        });
        knowledgeData.tags = tagsArray;
      } 
      // 纯文本处理
      else {
        if (!content.trim()) {
          toast.error('请填写内容');
          return;
        }
        knowledgeData.content = content;
      }

      if (editingItem) {
        await updateKnowledge(editingItem.id, knowledgeData);
        toast.success('知识已更新');
      } else {
        await createKnowledge(knowledgeData);
        toast.success('知识已添加');
      }

      setDialogOpen(false);
      setUploadingFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      await loadKnowledge();
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    const item = knowledge.find(k => k.id === id);
    if (!confirm('确定要删除这条知识吗?')) return;

    try {
      // 如果是文档类型，先删除Storage中的文件
      if (item?.content_type === 'document' && item.file_url) {
        await deleteKnowledgeDocument(item.file_url);
      }
      
      await deleteKnowledge(id);
      toast.success('已删除');
      await loadKnowledge();
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handleDuplicate = async (item: KnowledgeBase) => {
    if (!user) return;
    try {
      const data = {
        title: `${item.title} 副本`,
        content: item.content,
        category: item.category,
        tags: item.tags,
        created_by: user.id,
      };
      await createKnowledge(data as any);
      toast.success('已复制');
      await loadKnowledge();
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败');
    }
  };

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'assessment', label: '评估量表' },
    { value: 'therapy', label: '治疗方法' },
    { value: 'research', label: '研究资料' },
  ];

  const filteredKnowledge = knowledge.filter(k => {
    const matchCategory = selectedCategory === 'all' || k.category === selectedCategory;
    const matchSearch = k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       k.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">知识库管理</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">管理抑郁评测量表和治疗知识</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-11 sm:h-10 rounded-xl shadow-lg shadow-primary/10" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              添加知识
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">{editingItem ? '编辑知识' : '添加知识'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-bold">标题</Label>
                <Input
                  id="title"
                  placeholder="请输入知识标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-bold">分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessment">评估量表</SelectItem>
                    <SelectItem value="therapy">治疗方法</SelectItem>
                    <SelectItem value="research">研究资料</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-bold">内容</Label>
            {category === 'assessment' ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input value={newQuestionText} onChange={(e)=>setNewQuestionText(e.target.value)} placeholder="请输入题目文本" className="flex-1 h-11 rounded-xl" />
                  <Button onClick={()=>{
                    if(!newQuestionText.trim()) return;
                    setScaleQuestions(prev=>[...prev, { id: crypto.randomUUID(), text: newQuestionText.trim(), order: prev.length }]);
                    setNewQuestionText('');
                  }} className="h-11 rounded-xl px-6">添加题目</Button>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {scaleQuestions.length===0 ? (
                    <p className="text-muted-foreground text-sm">暂无题目，请添加</p>
                  ) : scaleQuestions.map((q, idx)=> (
                    <div key={q.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[11px] text-primary font-bold">{idx+1}</div>
                      <Input value={q.text} onChange={(e)=>{
                        const val = e.target.value; setScaleQuestions(prev=> prev.map((x,i)=> i===idx? { ...x, text: val }: x));
                      }} className="flex-1 h-10" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=> setScaleQuestions(prev=> {
                        if (idx===0) return prev; const arr = prev.slice(); const [item] = arr.splice(idx,1); arr.splice(idx-1,0,item); return arr.map((x,i)=> ({...x, order:i}));
                      })}><ArrowUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=> setScaleQuestions(prev=> {
                        if (idx===prev.length-1) return prev; const arr = prev.slice(); const [item] = arr.splice(idx,1); arr.splice(idx+1,0,item); return arr.map((x,i)=> ({...x, order:i}));
                      })}><ArrowDown className="w-4 h-4" /></Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={()=> setScaleQuestions(prev=> prev.filter((_,i)=> i!==idx).map((x,i)=> ({...x, order:i})))}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (category === 'therapy' || category === 'research') ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      if (file.size > 50 * 1024 * 1024) {
                        toast.error('文件大小不能超过50MB');
                        return;
                      }
                      
                      setUploadingFile(file);
                    }}
                    className="hidden"
                    id="document-upload"
                  />
                  <label htmlFor="document-upload" className="cursor-pointer block">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-foreground">点击上传文档</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持PDF、Word、Excel格式，最大50MB
                    </p>
                  </label>
                  {uploadingFile && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{uploadingFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadingFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {!isUploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              setUploadingFile(null);
                              setUploadProgress(0);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* 上传进度条 */}
                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">上传中...</span>
                            <span className="font-medium text-primary">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-bold">文档简介(可选)</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="为文档添加简短的描述..."
                    rows={3}
                    className="rounded-xl mt-2"
                  />
                </div>
              </div>
            ) : (
              <Textarea
                id="content"
                placeholder="请输入详细内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-xl min-h-[200px]"
              />
            )}
              </div>

              

              <Button 
                onClick={handleSave} 
                disabled={isUploading}
                className="w-full h-12 rounded-xl text-base font-bold disabled:opacity-50"
              >
                {isUploading ? `上传中 ${uploadProgress}%...` : '保存知识'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col gap-4 px-1">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="搜索知识..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className="rounded-full px-4 whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 知识列表 */}
      <div className="grid gap-4 px-1">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 bg-muted rounded-2xl" />
            ))}
          </>
        ) : filteredKnowledge.length > 0 ? (
          filteredKnowledge.map((item) => (
            <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-card">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col gap-4">
                  {/* 第一行：图标、标题、分类、操作按钮 */}
                  <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {item.content_type === 'document' ? (
                        <FileText className="w-5 h-5 text-primary" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    
                    {/* 标题和分类 */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CardTitle className="text-base font-bold leading-tight">{item.title}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary/70 border-0">
                        {categories.find(c => c.value === item.category)?.label}
                      </Badge>
                    </div>
                    
                    {/* 操作按钮组 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.content_type === 'document' && item.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => {
                            const url = getKnowledgeDocumentUrl(item.file_url!);
                            window.open(url, '_blank');
                          }}
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-slate-100"
                        onClick={() => handleOpenDialog(item)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                        onClick={() => handleDelete(item.id)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 第二行：文件信息或标签 */}
                  <div className="pl-[60px]">
                    {item.content_type === 'document' && item.file_name ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{item.file_name}</span>
                        {item.file_size && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="shrink-0">{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          </>
                        )}
                      </div>
                    ) : item.tags && item.tags.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {item.tags.slice(0, 4).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] py-0 px-2 border-slate-200 text-slate-500 bg-slate-50/50">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 4 && (
                          <Badge variant="outline" className="text-[10px] py-0 px-2 border-slate-200 text-slate-400">
                            +{item.tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {item.category === 'assessment' ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs px-3 py-1 border-primary/30 text-primary rounded-full">
                      题目数：{
                        (() => { 
                          try { const j = JSON.parse(item.content || '{}'); return Array.isArray(j.questions) ? j.questions.length : 0 } catch { return 0 } 
                        })()
                      }
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-full h-8 px-3"
                      onClick={() => {
                        try {
                          const j = JSON.parse(item.content || '{}');
                          const qs = Array.isArray(j.questions) ? j.questions.slice().sort((a: any,b: any) => (a.order??0)-(b.order??0)).map((q: any) => q.text) : [];
                          setViewingQuestions({ title: item.title, questions: qs });
                        } catch { setViewingQuestions({ title: item.title, questions: [] }); }
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> 查看题目
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-4 pt-4 border-t border-muted/50">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  创建于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-16">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 opacity-40" />
                </div>
                <p className="font-medium">暂无知识内容</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* 查看题目对话框 */}
      {viewingQuestions && (
        <Dialog open={true} onOpenChange={() => setViewingQuestions(null)}>
          <DialogContent className="max-w-lg w-[95vw] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{viewingQuestions.title} - 题目详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {viewingQuestions.questions.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无题目</p>
              ) : viewingQuestions.questions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[11px] text-primary font-bold">{idx+1}</div>
                  <div className="text-sm text-foreground">{q}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                className="rounded-xl px-6" 
                onClick={() => {
                  const item = knowledge.find(k => k.title === viewingQuestions?.title);
                  if (item) {
                    setViewingQuestions(null);
                    handleOpenDialog(item);
                  }
                }}
              >
                去编辑
              </Button>
              <Button className="rounded-xl px-6" onClick={() => setViewingQuestions(null)}>关闭</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
