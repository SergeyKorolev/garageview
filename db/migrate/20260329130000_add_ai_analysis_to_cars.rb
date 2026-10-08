class AddAiAnalysisToCars < ActiveRecord::Migration[8.0]
  def change
    add_column :cars, :ai_analysis, :jsonb, default: nil
    add_column :cars, :ai_analyzed_at, :datetime, default: nil
  end
end
