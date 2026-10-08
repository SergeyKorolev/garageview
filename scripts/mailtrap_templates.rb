#!/usr/bin/env ruby
# frozen_string_literal: true

# Manage all Garageview email templates in Mailtrap via the Ruby SDK.
#
# Usage:
#   bin/rails runner scripts/mailtrap_templates.rb list
#   bin/rails runner scripts/mailtrap_templates.rb sync
#   bin/rails runner scripts/mailtrap_templates.rb sync --force
#
# Or without Rails (requires MAILTRAP_API_TOKEN env var):
#   ruby scripts/mailtrap_templates.rb list
#   ruby scripts/mailtrap_templates.rb sync

require "bundler/setup"
require "mailtrap"

ACCOUNT_ID = ENV.fetch("MAILTRAP_ACCOUNT_ID", 2228711).to_i

def client
  api_key = ENV["MAILTRAP_API_TOKEN"]
  abort "ERROR: MAILTRAP_API_TOKEN is not set" unless api_key && !api_key.empty?
  Mailtrap::Client.new(api_key: api_key)
end

def templates_api
  Mailtrap::EmailTemplatesAPI.new(ACCOUNT_ID, client)
end

# ---------------------------------------------------------------------------
# Template definitions — single source of truth for all Garageview emails
# ---------------------------------------------------------------------------

TEMPLATES = {
  welcome_email: {
    name: "Welcome Email",
    subject: "Welcome to Garageview.ai, {{user_name}}!",
    category: "welcome_email",
    env_var: "MAILTRAP_WELCOME_TEMPLATE_UUID",
    body_html: '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7"><tr><td align="center" style="padding:24px 12px"><!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td><![endif]--><div style="max-width:600px;margin:0 auto"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:linear-gradient(135deg,#0b1120 0%,#1e3a5f 100%);padding:32px 24px;text-align:center"><img src="https://garageview.ai/logo-dark.png" alt="Garageview.ai" height="28" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.4">Welcome aboard, {{user_name}}!</h1></td></tr><tr><td style="padding:28px 24px"><p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">Thanks for joining <strong>Garageview.ai</strong> — your AI-powered car buying workspace.</p><p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">Here is what you can do:</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#128269;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>Save cars from mobile.de</strong> — use our Chrome extension to save listings with one click</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#129302;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>AI-powered analysis</strong> — get instant ratings, red flag detection, and negotiation tips</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#128200;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>Compare side by side</strong> — grid view, feature matrix, and deep research</td></tr></table></td></tr><tr><td style="padding:10px 0;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#127758;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>13 languages</strong> — switch anytime from your account settings</td></tr></table></td></tr></table><div style="text-align:center;margin:28px 0 8px"><a href="{{app_url}}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600">Open Garageview</a></div></td></tr><tr><td style="padding:20px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">Questions? Contact <a href="mailto:support@garageview.ai" style="color:#3b82f6;text-decoration:none">support@garageview.ai</a></p></td></tr></table></div><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>',
    body_text: <<~TEXT.strip
      Welcome aboard, {{user_name}}!

      Thanks for joining Garageview.ai — your AI-powered car buying workspace.

      Here is what you can do:
      - Save cars from mobile.de with our Chrome extension
      - AI-powered analysis — ratings, red flags, and negotiation tips
      - Compare side by side — grid view, feature matrix, and deep research
      - 13 languages — switch anytime from your account settings

      Open Garageview: {{app_url}}

      Questions? Contact support@garageview.ai
    TEXT
  },

  account_deleted: {
    name: "Account Deleted",
    subject: "Your Garageview.ai account has been deleted",
    category: "account_deleted",
    env_var: "MAILTRAP_DELETED_TEMPLATE_UUID",
    body_html: '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7"><tr><td align="center" style="padding:24px 12px"><!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td><![endif]--><div style="max-width:600px;margin:0 auto"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background-color:#0b1120;padding:32px 24px;text-align:center"><img src="https://garageview.ai/logo-dark.png" alt="Garageview.ai" height="28" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto"></td></tr><tr><td style="padding:28px 24px"><h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.4">Goodbye, {{user_name}}</h1><p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">Your Garageview.ai account has been successfully deleted as requested.</p><p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">All your data has been permanently removed:</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#128451;</td><td style="color:#374151;font-size:14px;line-height:1.6">Your saved car collections and buckets</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#129302;</td><td style="color:#374151;font-size:14px;line-height:1.6">AI analyses and ratings</td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#128200;</td><td style="color:#374151;font-size:14px;line-height:1.6">Deep research reports</td></tr></table></td></tr><tr><td style="padding:10px 0;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:12px;vertical-align:top;font-size:18px;line-height:1">&#9881;</td><td style="color:#374151;font-size:14px;line-height:1.6">Account settings and preferences</td></tr></table></td></tr></table><p style="margin:20px 0 16px;color:#374151;font-size:15px;line-height:1.7">Want to come back? Just sign in with Google at <a href="https://garageview.ai" style="color:#3b82f6;text-decoration:none">garageview.ai</a> for a fresh start.</p><div style="background-color:#f0f9ff;border-radius:8px;padding:14px 16px;border-left:4px solid #3b82f6"><p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6">Did you not request this? Contact us at <a href="mailto:support@garageview.ai" style="color:#1e40af;font-weight:600">support@garageview.ai</a></p></div></td></tr><tr><td style="padding:20px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px">Thank you for trying Garageview.ai</p></td></tr></table></div><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>',
    body_text: <<~TEXT.strip
      Goodbye, {{user_name}}

      Your Garageview.ai account has been successfully deleted as requested.

      All your data has been permanently removed:
      - Your saved car collections and buckets
      - AI analyses and ratings
      - Deep research reports
      - Account settings and preferences

      Want to come back? Just sign in with Google at garageview.ai for a fresh start.

      Did you not request this? Contact us at support@garageview.ai

      Thank you for trying Garageview.ai
    TEXT
  },

  collection_invite: {
    name: "Collection Invitation",
    subject: "{{inviter_name}} invited you to collaborate on {{collection_name}}",
    category: "collection_invite",
    env_var: "MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID",
    body_html: '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7"><tr><td align="center" style="padding:24px 12px"><!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td><![endif]--><div style="max-width:600px;margin:0 auto"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:linear-gradient(135deg,#0b1120 0%,#1e3a5f 100%);padding:32px 24px;text-align:center"><img src="https://garageview.ai/logo-dark.png" alt="Garageview.ai" height="28" style="margin-bottom:16px;display:block;margin-left:auto;margin-right:auto"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.4">{{inviter_name}} invited you to collaborate</h1></td></tr><tr><td style="padding:28px 24px;text-align:center"><div style="display:inline-block;background-color:#eef2ff;border-radius:8px;padding:12px 20px;margin-bottom:8px"><p style="margin:0;color:#4f46e5;font-size:18px;font-weight:600;line-height:1.4">{{collection_name}}</p></div><p style="margin:12px 0 0;color:#6b7280;font-size:14px;line-height:1.5">You have been invited as <strong style="color:#374151">{{role}}</strong></p></td></tr><tr><td style="padding:0 24px 28px"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:16px 0;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:6px 0;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:10px;vertical-align:top;font-size:16px;line-height:1">&#128065;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>Viewers</strong> can browse cars, see AI ratings, and explore research</td></tr></table></td></tr><tr><td style="padding:6px 0;font-size:0"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-right:10px;vertical-align:top;font-size:16px;line-height:1">&#9999;&#65039;</td><td style="color:#374151;font-size:14px;line-height:1.6"><strong>Editors</strong> can also add cars, rate them, and manage search filters</td></tr></table></td></tr></table></td></tr></table><div style="text-align:center;margin:24px 0 0"><a href="{{accept_url}}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600">Accept Invitation</a></div><p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.5">If the button does not work, copy and paste this link:<br><a href="{{accept_url}}" style="color:#3b82f6;text-decoration:none;word-break:break-all">{{accept_url}}</a></p></td></tr><tr><td style="padding:20px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center"><p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">This invitation expires in 7 days.<br><a href="{{app_url}}" style="color:#3b82f6;text-decoration:none">garageview.ai</a></p></td></tr></table></div><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>',
    body_text: <<~TEXT.strip
      {{inviter_name}} invited you to collaborate

      Collection: {{collection_name}}
      Role: {{role}}

      Viewers can browse cars, see AI ratings, and explore research.
      Editors can also add cars, rate them, and manage search filters.

      Accept the invitation:
      {{accept_url}}

      This invitation expires in 7 days.

      garageview.ai
      {{app_url}}
    TEXT
  }
}.freeze

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

command = ARGV[0] || "list"
force = ARGV.include?("--force")

case command
when "list"
  api = templates_api
  remote = api.list
  puts "Mailtrap templates (account #{ACCOUNT_ID}):\n\n"
  remote.each do |t|
    puts "  #{t.name}"
    puts "    ID: #{t.id} | UUID: #{t.uuid}"
    puts "    Subject: #{t.subject}"
    puts "    Category: #{t.category}"
    puts ""
  end
  puts "#{remote.size} template(s) found."

when "sync"
  api = templates_api
  remote = api.list
  remote_by_category = remote.each_with_object({}) { |t, h| h[t.category] = t }

  TEMPLATES.each do |key, defn|
    existing = remote_by_category[defn[:category]]

    if existing && !force
      puts "[skip] #{defn[:name]} already exists (UUID: #{existing.uuid})"
      puts "       #{defn[:env_var]}=#{existing.uuid}"
    elsif existing && force
      puts "[update] #{defn[:name]} (ID: #{existing.id})..."
      updated = api.update(existing.id, {
        name: defn[:name],
        subject: defn[:subject],
        category: defn[:category],
        body_html: defn[:body_html],
        body_text: defn[:body_text]
      })
      puts "         Updated. UUID: #{updated.uuid}"
      puts "         #{defn[:env_var]}=#{updated.uuid}"
    else
      puts "[create] #{defn[:name]}..."
      created = api.create(
        name: defn[:name],
        subject: defn[:subject],
        category: defn[:category],
        body_html: defn[:body_html],
        body_text: defn[:body_text]
      )
      puts "         Created! UUID: #{created.uuid}"
      puts "         #{defn[:env_var]}=#{created.uuid}"
    end
    puts ""
  end

else
  puts "Usage: ruby scripts/mailtrap_templates.rb [list|sync] [--force]"
  puts ""
  puts "  list          List all templates in Mailtrap"
  puts "  sync          Create missing templates (skip existing)"
  puts "  sync --force  Create or update ALL templates"
end
