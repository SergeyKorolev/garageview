require "rails_helper"

RSpec.describe "Localized landing pages", type: :request do
  before do
    # These checks exercise HTML and metadata without requiring compiled frontend assets.
    allow_any_instance_of(ActionView::Base).to receive(:stylesheet_link_tag).and_return("")
    allow_any_instance_of(ActionView::Base).to receive(:javascript_include_tag).and_return("")
  end

  PagesHelper::LOCALE_CODES.each do |locale|
    it "serves crawlable marketplace copy and matching metadata in #{locale}" do
      get "/#{locale}"
      expect(response).to have_http_status(:ok)
      html = Nokogiri::HTML(response.body)
      copy = JSON.parse(File.read(Rails.root.join("app/javascript/i18n/locales/#{locale}.json"))).fetch("landing")
      expect(html.at_css("html")["lang"]).to eq(locale)
      expect(html.css("h1").size).to eq(1)
      expect(html.at_css("h1").text.strip).to eq(copy.fetch("hero"))
      expect(html.at_css("title").text).to eq(copy.fetch("metaTitle"))
      expect(html.at_css('meta[name="description"]')["content"]).to eq(copy.fetch("metaDescription"))
      expect(html.at_css('link[rel="canonical"]')["href"]).to eq("https://garageview.ai/#{locale}")
      expect(html.css('link[hreflang]').map { |link| link["hreflang"] }).to match_array(PagesHelper::LOCALE_CODES + [ "x-default" ])
      %w[mobile.de AutoScout24 Otomoto].each do |source|
        expect(html.at_css("h1 + p").text).to include(source)
      end
      expect(html.text).to include(copy.fetch("importNote"))
      expect(html.at_css('meta[name="keywords"]')).to be_nil
      video_link = html.at_css('section a[href="https://www.youtube.com/watch?v=-SxWbA7cpR4"]')
      expect(video_link.text).to eq(copy.fetch("watchVideo"))
      expect(video_link.parent.at_css('a[href*="chromewebstore.google.com"]')).to be_present
      expect(html.at_css("footer a[href='/#{locale}/guides/']").text).to eq(copy.fetch("guides"))
    end
  end

  it "lists reciprocal homepage alternatives in the sitemap" do
    xml = Nokogiri::XML(File.read(Rails.root.join("public/sitemap.xml")))
    ns = { "s" => "http://www.sitemaps.org/schemas/sitemap/0.9", "x" => "http://www.w3.org/1999/xhtml" }
    PagesHelper::LOCALE_CODES.each do |locale|
      entry = xml.at_xpath("//s:url[s:loc='https://garageview.ai/#{locale}']", ns)
      expect(entry.xpath("x:link", ns).map { |link| link["hreflang"] }).to match_array(PagesHelper::LOCALE_CODES + [ "x-default" ])
    end
  end
end
