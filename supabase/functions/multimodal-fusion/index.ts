// 多模态情绪融合分析
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultimodalFusionRequest {
  text_analysis?: any;
  image_analysis?: any;
  voice_analysis?: any;
  video_analysis?: any;
  user_id: string;
  assessment_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
      text_analysis,
      image_analysis,
      voice_analysis,
      video_analysis,
      user_id,
      assessment_id,
    }: MultimodalFusionRequest = await req.json();

    // 1. 提取各模态的情绪分数(0-10, 10为最严重)
    const scores = {
      text: text_analysis?.emotion_score || 0,
      image: image_analysis?.emotion_score || 0,
      voice: voice_analysis?.emotion_score || 0,
      video: video_analysis?.emotion_score || 0,
    };

    // 2. 加权融合算法(文本40%, 图片20%, 语音20%, 视频20%)
    const weights = {
      text: 0.4,
      image: 0.2,
      voice: 0.2,
      video: 0.2,
    };

    // 计算有效模态数量
    const activeModalities = Object.values(scores).filter(s => s > 0).length;
    
    // 动态调整权重(如果某些模态缺失)
    let adjustedWeights = { ...weights };
    if (activeModalities < 4) {
      const totalActiveWeight = Object.entries(scores)
        .filter(([_, score]) => score > 0)
        .reduce((sum, [key, _]) => sum + weights[key as keyof typeof weights], 0);
      
      Object.keys(adjustedWeights).forEach(key => {
        if (scores[key as keyof typeof scores] > 0) {
          adjustedWeights[key as keyof typeof adjustedWeights] = 
            weights[key as keyof typeof weights] / totalActiveWeight;
        } else {
          adjustedWeights[key as keyof typeof adjustedWeights] = 0;
        }
      });
    }

    // 3. 计算综合情绪分数
    const fusedScore = 
      scores.text * adjustedWeights.text +
      scores.image * adjustedWeights.image +
      scores.voice * adjustedWeights.voice +
      scores.video * adjustedWeights.video;

    // 4. 风险等级评估(0-10)
    const riskLevel = Math.round(fusedScore);

    // 5. 多维症状分析
    const symptoms = {
      情绪低落: Math.round((scores.text * 0.5 + scores.video * 0.5) * 10) / 10,
      兴趣丧失: Math.round((scores.text * 0.6 + scores.voice * 0.4) * 10) / 10,
      睡眠障碍: Math.round((scores.text * 0.7 + scores.image * 0.3) * 10) / 10,
      精力下降: Math.round((scores.voice * 0.5 + scores.video * 0.5) * 10) / 10,
      自我评价低: Math.round((scores.text * 0.8 + scores.image * 0.2) * 10) / 10,
      注意力不集中: Math.round((scores.text * 0.5 + scores.voice * 0.5) * 10) / 10,
    };

    // 6. 生成结构化诊疗建议
    const recommendations = [];
    if (riskLevel >= 8) {
      recommendations.push('建议立即寻求专业心理医生帮助');
      recommendations.push('考虑药物治疗配合心理咨询');
      recommendations.push('建立24小时紧急联系机制');
    } else if (riskLevel >= 5) {
      recommendations.push('建议定期进行心理咨询');
      recommendations.push('尝试认知行为疗法(CBT)');
      recommendations.push('保持规律作息和适度运动');
    } else if (riskLevel >= 3) {
      recommendations.push('建议进行自我调节和放松训练');
      recommendations.push('参与社交活动,寻求社会支持');
      recommendations.push('使用冥想和正念练习');
    } else {
      recommendations.push('保持良好的生活习惯');
      recommendations.push('定期进行情绪自我监测');
      recommendations.push('培养兴趣爱好,丰富生活');
    }

    // 7. 生成详细分析报告
    const analysisPrompt = `作为专业心理评估专家,请根据以下多模态分析结果生成详细的评估报告:

【综合情绪分数】${fusedScore.toFixed(2)}/10
【风险等级】${riskLevel}/10
【各模态分数】
- 文本分析: ${scores.text}/10
- 图片分析: ${scores.image}/10
- 语音分析: ${scores.voice}/10
- 视频分析: ${scores.video}/10

【多维症状评分】
${Object.entries(symptoms).map(([key, value]) => `- ${key}: ${value}/10`).join('\n')}

请生成一份专业、温暖的评估报告,包括:
1. 整体情绪状态评估(100字)
2. 主要症状表现分析(100字)
3. 可能的影响因素(80字)
4. 具体改善建议(120字)

报告要客观专业,同时给予用户关怀和希望。`;

    const reportResponse = await fetch(
      'https://app-97zabxvzebcx-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: '你是专业的心理评估专家' },
            { role: 'user', content: analysisPrompt },
          ],
        }),
      }
    );

    let detailedReport = '评估报告生成中...';
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      detailedReport = reportData?.choices?.[0]?.delta?.content || detailedReport;
    }

    // 8. 更新评估记录
    const { error: updateError } = await supabase
      .from('assessments')
      .update({
        ai_analysis: {
          multimodal_scores: scores,
          fused_score: fusedScore,
          symptoms,
          modalities_used: activeModalities,
          timestamp: new Date().toISOString(),
        },
        risk_level: riskLevel,
        score: Math.round((10 - fusedScore) * 10),
        report: {
          content: detailedReport,
          recommendations,
          generated_at: new Date().toISOString(),
        },
      })
      .eq('id', assessment_id);

    if (updateError) {
      console.error('更新评估记录失败:', updateError);
    }

    // 9. 高风险自动预警
    if (riskLevel >= 7) {
      const { error: alertError } = await supabase
        .from('risk_alerts')
        .insert({
          patient_id: user_id,
          alert_type: '多模态评估高风险',
          risk_level: riskLevel,
          description: `综合情绪分数${fusedScore.toFixed(2)}/10,建议立即关注`,
          data_source: '多模态情绪融合分析',
          source_id: assessment_id,
        });

      if (alertError) {
        console.error('创建预警失败:', alertError);
      }
    }

    // 10. 返回融合结果
    return new Response(JSON.stringify({
      success: true,
      fused_score: fusedScore,
      risk_level: riskLevel,
      symptoms,
      recommendations,
      detailed_report: detailedReport,
      modalities_used: activeModalities,
      weights_applied: adjustedWeights,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('multimodal-fusion错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
