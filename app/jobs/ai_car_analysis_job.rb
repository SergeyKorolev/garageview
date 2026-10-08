class AiCarAnalysisJob < ApplicationJob
  queue_as :default

  def perform(car_id, force: false)
    car = Car.find(car_id)
    return unless car.status == "ready"

    AiCarAnalysisService.analyze(car, force: force)
  rescue StandardError => e
    Rails.logger.error("AiCarAnalysisJob failed for car #{car_id}: #{e.message}")
  end
end
