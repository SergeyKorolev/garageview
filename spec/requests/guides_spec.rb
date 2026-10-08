require "rails_helper"

RSpec.describe "Hugo guides", type: :request do
  PagesHelper::LOCALE_CODES.each do |locale|
    it "serves the #{locale} index and its published articles without authentication" do
      get "/#{locale}/guides/"
      expect(response).to have_http_status(:ok)
      index = Nokogiri::HTML(response.body)
      expect(index.at_css("html")["lang"]).to eq(locale)
      links = index.css(".card h2 a")
      expect(links.length).to be >= 10
      expect(index.css(".card-image").length).to eq(links.length)
      links.each do |link|
        get link["href"]
        expect(response).to have_http_status(:ok)
        article = Nokogiri::HTML(response.body)
        expect(article.at_css("h1").text).to eq(link.text)
        expect(article.at_css('link[rel="canonical"]')["href"]).to eq("https://garageview.ai#{link['href']}")
        expect(article.css("link[hreflang]").length).to eq(8)
        expect(article.css(".prose h2").length).to be >= 2
        expect(article.at_css(".prose").text.split.length).to be > 100
        illustration = article.at_css(".article-figure img")
        expect(illustration["alt"]).to be_present
        get illustration["src"]
        expect(response).to have_http_status(:ok)
        expect(response.media_type).to eq("image/svg+xml")
        expect(article.css(".takeaways li").length).to be >= 3
        expect(article.css(".contents nav a")).not_to be_empty
        expect(article.at_css('a.button[href="/collections"]')).to be_present
        expect(article.css("script")).to be_empty
      end
    end
  end

  it "returns 404 for missing articles and unsupported languages instead of the SPA" do
    %w[/en/guides/missing/ /en/guides/missing /zz/guides/ /zz/guides/example/].each do |path|
      get path
      expect(response).to have_http_status(:not_found)
    end
  end

  it "serves a sitemap containing all translated guide pages" do
    get "/guides-sitemap.xml"
    expect(response).to have_http_status(:ok)
    xml = Nokogiri::XML(response.body)
    ns = { "s" => "http://www.sitemaps.org/schemas/sitemap/0.9", "x" => "http://www.w3.org/1999/xhtml" }
    expected_pages = Dir.glob(Rails.root.join("public/{en,de,fr,es,it,pl,uk}/guides/**/index.html")).length
    expect(xml.xpath("//s:url", ns).length).to eq(expected_pages)
    xml.xpath("//s:url", ns).each do |entry|
      expect(entry.xpath("x:link", ns).map { |link| link["hreflang"] }).to match_array(PagesHelper::LOCALE_CODES + [ "x-default" ])
    end
  end
end
