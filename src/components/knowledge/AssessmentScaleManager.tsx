import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createKnowledge, deleteKnowledge, getKnowledgeBase, updateKnowledge } from '@/db/api'
import type { KnowledgeBase } from '@/types'

type ScaleQuestion = { id: string; text: string; options?: string[]; weight?: number; order: number }
type ScaleContent = {
  type: 'scale'
  scale_id: string
  name: string
  description?: string
  version: number
  questions: ScaleQuestion[]
  history?: Array<{ version: number; timestamp: string; questions: ScaleQuestion[]; description?: string }>
}

function parseScale(item: KnowledgeBase): ScaleContent | null {
  try {
    const json = JSON.parse(item.content || '{}')
    if (json && json.type === 'scale') return json as ScaleContent
    return null
  } catch {
    return null
  }
}

export default function AssessmentScaleManager() {
  const [scales, setScales] = useState<KnowledgeBase[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeBase | null>(null)

  const [scaleId, setScaleId] = useState('PHQ-9')
  const [name, setName] = useState('健康问卷')
  const [description, setDescription] = useState('用于筛查抑郁症状及其严重程度')
  const [questions, setQuestions] = useState<ScaleQuestion[]>([])
  const [newQuestion, setNewQuestion] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const data = await getKnowledgeBase('assessment')
      setScales(data.filter(d => parseScale(d)))
    } catch (e) {
      toast.error('加载量表失败')
    }
  }

  const openNew = () => {
    setEditing(null)
    setScaleId('PHQ-9')
    setName('健康问卷')
    setDescription('用于筛查抑郁症状及其严重程度')
    setQuestions([])
    setNewQuestion('')
    setDialogOpen(true)
  }

  const openEdit = (item: KnowledgeBase) => {
    setEditing(item)
    const sc = parseScale(item)!
    setScaleId(sc.scale_id)
    setName(sc.name)
    setDescription(sc.description || '')
    setQuestions(sc.questions)
    setNewQuestion('')
    setDialogOpen(true)
  }

  const addQuestion = () => {
    const text = newQuestion.trim()
    if (!text) return
    const q: ScaleQuestion = { id: crypto.randomUUID(), text, order: questions.length }
    setQuestions(prev => [...prev, q])
    setNewQuestion('')
  }

  const move = (index: number, dir: -1 | 1) => {
    setQuestions(prev => {
      const arr = prev.slice()
      const target = index + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[index], arr[target]] = [arr[target], arr[index]]
      return arr.map((q, i) => ({ ...q, order: i }))
    })
  }

  const remove = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })))
  }

  const save = async () => {
    if (!scaleId.trim() || !name.trim() || questions.length === 0) {
      toast.error('请填写量表基本信息并添加题目')
      return
    }
    const content: ScaleContent = {
      type: 'scale',
      scale_id: scaleId,
      name,
      description,
      version: (editing ? (parseScale(editing)?.version || 1) + 1 : 1),
      questions: questions.map((q, i) => ({ ...q, order: i })),
      history: editing ? [{
        version: parseScale(editing)!.version,
        timestamp: new Date().toISOString(),
        questions: parseScale(editing)!.questions,
        description: parseScale(editing)!.description,
      }, ...((parseScale(editing)!.history)||[])] : []
    }

    const payload = {
      title: `${scaleId} 评估量表`,
      category: 'assessment',
      content: JSON.stringify(content),
      tags: [scaleId, '量表'],
    }

    try {
      if (editing) await updateKnowledge(editing.id, payload)
      else await createKnowledge(payload)
      toast.success('量表已保存')
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast.error('保存失败')
    }
  }

  const removeScale = async (id: string) => {
    if (!confirm('确定删除该量表？')) return
    try { await deleteKnowledge(id); toast.success('已删除'); await load() } catch { toast.error('删除失败') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">量表管理</h3>
        <Button onClick={openNew} className="rounded-xl">新建量表</Button>
      </div>

      <div className="grid gap-3">
        {scales.map(item => {
          const sc = parseScale(item)!
          return (
            <Card key={item.id} className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">{sc.scale_id} · {sc.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">v{sc.version}</Badge>
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>编辑</Button>
                    <Button size="sm" variant="destructive" onClick={() => removeScale(item.id)}>删除</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground">{sc.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">题目数：{sc.questions.length}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑量表' : '新建量表'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>量表ID</Label>
              <Input value={scaleId} onChange={e => setScaleId(e.target.value)} />
              <Label>名称</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
              <Label>描述</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>题目</Label>
              <div className="flex gap-2">
                <Input placeholder="输入题目文本" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} />
                <Button onClick={addQuestion}>添加</Button>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <span className="text-xs w-6 text-center">{i+1}</span>
                    <span className="flex-1 text-sm">{q.text}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => move(i, -1)}>上移</Button>
                      <Button size="sm" variant="outline" onClick={() => move(i, 1)}>下移</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(i)}>删除</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button className="w-full h-12 rounded-xl" onClick={save}>保存量表</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

