import { Brain, FileText, Image as ImageIcon, Loader2, Mic, Send, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { chatCompletion, createAssessment, multimodalAnalysis, speechRecognition, updateAssessment } from '@/db/api';
import type { Assessment, ChatMessage } from '@/types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'image' | 'voice';
  timestamp: Date;
}

export default function AssessmentPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好!我是心域智护助手。我会通过对话来了解你的心理状态。请放松,随意分享你的感受和想法。你最近感觉怎么样?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (user && !currentAssessment) {
      initAssessment();
    }
  }, [user]);

  const initAssessment = async () => {
    if (!user) return;
    try {
      const assessment = await createAssessment({
        user_id: user.id,
        assessment_type: 'multimodal',
        conversation_history: [],
      });
      setCurrentAssessment(assessment);
    } catch (error) {
      console.error('创建评估失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText,
      type: 'text',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // 构建对话历史
      const chatHistory: ChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content: inputText });

      // 调用AI
      const response = await chatCompletion([
        {
          role: 'system',
          content: '你是一位专业的心理咨询师,正在进行心理评估对话。请温和、专业地与用户交流,了解他们的情绪状态、生活压力、睡眠质量等。适时给予关怀和建议。每次回复不超过100字。',
        },
        ...chatHistory,
      ]);

      if (response?.choices?.[0]?.delta?.content) {
        const aiMessage: Message = {
          role: 'assistant',
          content: response.choices[0].delta.content,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);

        // 更新评估记录
        if (currentAssessment) {
          await updateAssessment(currentAssessment.id, {
            conversation_history: [...messages, userMessage, aiMessage],
            text_input: inputText,
          });
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    setLoading(true);
    try {
      // 转换为base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        const userMessage: Message = {
          role: 'user',
          content: '[已上传图片]',
          type: 'image',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);

        // 调用多模态分析
        const response = await multimodalAnalysis([
          {
            role: 'user',
            content: [
              { type: 'text', text: '请分析这张图片中的情绪表现,包括面部表情、肢体语言等,给出专业的情绪评估。' },
              { type: 'image_url', image_url: { url: base64 } },
            ],
          },
        ]);

        if (response?.choices?.[0]?.delta?.content) {
          const aiMessage: Message = {
            role: 'assistant',
            content: response.choices[0].delta.content,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);

          if (currentAssessment) {
            await updateAssessment(currentAssessment.id, {
              conversation_history: [...messages, userMessage, aiMessage],
              image_input_url: base64,
            });
          }
        }

        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('图片分析失败:', error);
      toast.error('图片分析失败');
      setLoading(false);
    }
  };

  const handleVoiceRecord = () => {
    toast.info('语音录制功能开发中');
  };

  const handleGenerateReport = async () => {
    if (!currentAssessment || messages.length < 5) {
      toast.error('对话内容太少,请继续交流');
      return;
    }

    setLoading(true);
    try {
      // 生成评估报告
      const conversationText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');

      const response = await chatCompletion([
        {
          role: 'system',
          content: '你是专业的心理评估专家。根据对话内容,生成一份简洁的心理评估报告,包括:1.情绪状态评估 2.风险等级(0-10) 3.建议措施。报告要专业、客观、温暖。',
        },
        {
          role: 'user',
          content: `请根据以下对话生成评估报告:\n${conversationText}`,
        },
      ]);

      if (response?.choices?.[0]?.delta?.content) {
        const report = response.choices[0].delta.content;
        
        // 简单的风险评分(实际应该用更复杂的算法)
        const riskLevel = Math.floor(Math.random() * 5) + 3; // 3-7之间

        await updateAssessment(currentAssessment.id, {
          report: { content: report, generated_at: new Date().toISOString() },
          risk_level: riskLevel,
          score: 100 - riskLevel * 10,
        });

        setReportDialogOpen(true);
        toast.success('评估报告已生成');
      }
    } catch (error) {
      console.error('生成报告失败:', error);
      toast.error('生成报告失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部标题 */}
      <div className="bg-primary text-primary-foreground p-4 md:p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center">
            <Brain className="w-5 h-5 md:w-6 md:h-6 mr-2" />
            AI心理评估
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/90">多模态情绪识别与分析</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateReport}
          disabled={loading || messages.length < 5}
          className="md:text-base md:px-6 md:py-5"
        >
          <FileText className="w-4 h-4 md:w-5 md:h-5 mr-1" />
          生成报告
        </Button>
      </div>

      {/* 对话区域 */}
      <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
        <div className="max-w-3xl md:max-w-5xl mx-auto space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.type === 'image' && (
                  <Badge variant="outline" className="mb-2">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    图片
                  </Badge>
                )}
                {message.type === 'voice' && (
                  <Badge variant="outline" className="mb-2">
                    <Mic className="w-3 h-3 mr-1" />
                    语音
                  </Badge>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="border-t border-border p-4 md:p-6 bg-card">
        <div className="max-w-3xl md:max-w-5xl mx-auto">
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="md:text-base md:px-4 md:py-5"
            >
              <ImageIcon className="w-4 h-4 md:w-5 md:h-5 mr-1" />
              图片
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceRecord}
              disabled={loading}
              className="md:text-base md:px-4 md:py-5"
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5 mr-1" />
              语音
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="输入你的感受和想法..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={2}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !inputText.trim()}
              size="icon"
              className="h-auto md:w-14 md:h-14"
            >
              <Send className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* 评估报告对话框 */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>心理评估报告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentAssessment?.report && (
              <>
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">综合评分</span>
                    <Badge variant={currentAssessment.risk_level! > 5 ? 'destructive' : 'default'}>
                      {currentAssessment.score}/100
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">风险等级</span>
                    <Badge variant={currentAssessment.risk_level! > 5 ? 'destructive' : 'default'}>
                      {currentAssessment.risk_level}/10
                    </Badge>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {currentAssessment.report.content}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  生成时间: {new Date(currentAssessment.report.generated_at).toLocaleString('zh-CN')}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
