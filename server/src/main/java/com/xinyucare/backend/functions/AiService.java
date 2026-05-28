package com.xinyucare.backend.functions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xinyucare.backend.config.OpenRouterProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.xinyucare.backend.common.ApiException;

@Service
public class AiService {

  private final OpenRouterProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

  public AiService(OpenRouterProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> chatCompletion(Map<String, Object> payload) {
    return callTextModel((List<Map<String, Object>>) payload.get("messages"), 512);
  }

  public Map<String, Object> multimodalAnalysis(Map<String, Object> payload) {
    return callVisionModel((List<Map<String, Object>>) payload.get("messages"), 256);
  }

  public Map<String, Object> speechRecognition(Map<String, Object> payload) {
    if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
      return Map.of("text", "当前环境未配置 OpenRouter API Key，已返回本地占位响应。");
    }

    Map<String, Object> inputAudio = payload.get("input_audio") instanceof Map<?, ?> map
        ? (Map<String, Object>) map
        : Map.of(
            "data", payload.getOrDefault("speech", ""),
            "format", payload.getOrDefault("format", "wav")
        );
    String audioData = String.valueOf(inputAudio.getOrDefault("data", ""));
    String format = String.valueOf(inputAudio.getOrDefault("format", "wav"));
    if (audioData.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "缺少音频数据");
    }

    return callTranscriptionModel(Map.of(
        "model", payload.getOrDefault("model", properties.getTranscriptionModel()),
        "input_audio", Map.of("data", audioData, "format", format)
    ));
  }

  public Map<String, Object> ragRetrieval(Map<String, Object> payload) {
    String query = String.valueOf(payload.getOrDefault("query", ""));
    String assessmentType = String.valueOf(payload.getOrDefault("assessment_type", "PHQ-9"));
    return Map.of(
        "choices", List.of(Map.of("message", Map.of("content", "请继续描述你的情况，我会结合当前评估维度进一步了解你。"))),
        "knowledge_used", 0,
        "assessment_type", assessmentType,
        "query", query
    );
  }

  public Map<String, Object> multimodalFusion(Map<String, Object> payload) {
    double textScore = score(payload.get("text_analysis"));
    double imageScore = score(payload.get("image_analysis"));
    double voiceScore = score(payload.get("voice_analysis"));
    double videoScore = score(payload.get("video_analysis"));
    double fused = (textScore * 0.4) + (imageScore * 0.2) + (voiceScore * 0.2) + (videoScore * 0.2);
    int riskLevel = Math.max(0, Math.min(10, (int) Math.round(fused)));
    return Map.of(
        "success", true,
        "fused_score", fused,
        "risk_level", riskLevel,
        "symptoms", Map.of(
            "情绪低落", roundHalf(textScore),
            "兴趣丧失", roundHalf((textScore + voiceScore) / 2.0),
            "精力下降", roundHalf((voiceScore + videoScore) / 2.0)
        ),
        "recommendations", riskLevel >= 7
            ? List.of("建议尽快联系医生或心理咨询师。", "保持与可信赖亲友的沟通。")
            : List.of("保持规律作息。", "继续记录近期情绪变化。"),
        "detailed_report", "当前为本地融合分析基础版，已输出综合风险分数，可继续结合问卷、语音和图像结果做人工复核。"
    );
  }

  private Map<String, Object> callTextModel(List<Map<String, Object>> messages, int maxTokens) {
    return callModel(properties.getTextModel(), messages, maxTokens);
  }

  private Map<String, Object> callVisionModel(List<Map<String, Object>> messages, int maxTokens) {
    return callModel(properties.getVisionModel(), messages, maxTokens);
  }

  private Map<String, Object> callModel(String model, List<Map<String, Object>> messages, int maxTokens) {
    if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
      return Map.of(
          "choices", List.of(Map.of("message", Map.of("content", "当前环境未配置 OpenRouter API Key，已返回本地占位响应。"))),
          "model", model
      );
    }
    try {
      String body = objectMapper.writeValueAsString(Map.of(
          "model", model,
          "messages", messages,
          "stream", false,
          "max_tokens", maxTokens
      ));
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("https://openrouter.ai/api/v1/chat/completions"))
          .header("Authorization", "Bearer " + properties.getApiKey())
          .header("Content-Type", "application/json")
          .header("HTTP-Referer", properties.getSiteUrl())
          .header("X-Title", properties.getAppName())
          .timeout(Duration.ofSeconds(90))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      JsonNode jsonNode = objectMapper.readTree(response.body());
      return objectMapper.convertValue(jsonNode, Map.class);
    } catch (IOException | InterruptedException e) {
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      return Map.of(
          "choices", List.of(Map.of("message", Map.of("content", "AI 服务暂时不可用，请稍后重试。"))),
          "error", e.getMessage()
      );
    }
  }

  private Map<String, Object> callTranscriptionModel(Map<String, Object> payload) {
    try {
      String body = objectMapper.writeValueAsString(payload);
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create("https://openrouter.ai/api/v1/audio/transcriptions"))
          .header("Authorization", "Bearer " + properties.getApiKey())
          .header("Content-Type", "application/json")
          .header("HTTP-Referer", properties.getSiteUrl())
          .header("X-Title", properties.getAppName())
          .timeout(Duration.ofSeconds(90))
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      JsonNode jsonNode = objectMapper.readTree(response.body());
      return objectMapper.convertValue(jsonNode, Map.class);
    } catch (IOException | InterruptedException e) {
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      return Map.of("text", "", "error", e.getMessage());
    }
  }

  private double score(Object raw) {
    if (raw instanceof Map<?, ?> map) {
      Object emotionScore = map.get("emotion_score");
      if (emotionScore instanceof Number number) {
        return number.doubleValue();
      }
      Object risk = map.get("risk_score");
      if (risk instanceof Number number) {
        return number.doubleValue();
      }
      Object score = map.get("score");
      if (score instanceof Number number) {
        return number.doubleValue();
      }
    }
    return 0.0;
  }

  private double roundHalf(double value) {
    return Math.round(value * 10.0) / 10.0;
  }
}
