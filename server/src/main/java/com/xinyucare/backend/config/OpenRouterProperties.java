package com.xinyucare.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "openrouter")
public class OpenRouterProperties {

  private String apiKey;
  private String siteUrl;
  private String appName;
  private String textModel;
  private String visionModel;
  private String transcriptionModel;

  public String getApiKey() {
    return apiKey;
  }

  public void setApiKey(String apiKey) {
    this.apiKey = apiKey;
  }

  public String getSiteUrl() {
    return siteUrl;
  }

  public void setSiteUrl(String siteUrl) {
    this.siteUrl = siteUrl;
  }

  public String getAppName() {
    return appName;
  }

  public void setAppName(String appName) {
    this.appName = appName;
  }

  public String getTextModel() {
    return textModel;
  }

  public void setTextModel(String textModel) {
    this.textModel = textModel;
  }

  public String getVisionModel() {
    return visionModel;
  }

  public void setVisionModel(String visionModel) {
    this.visionModel = visionModel;
  }

  public String getTranscriptionModel() {
    return transcriptionModel;
  }

  public void setTranscriptionModel(String transcriptionModel) {
    this.transcriptionModel = transcriptionModel;
  }
}
