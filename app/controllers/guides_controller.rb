class GuidesController < ApplicationController
  # Existing pages are served by Rails' static-file middleware before routing.
  # Reserve this namespace so a missing article never falls through to the SPA.
  def missing
    head :not_found
  end
end
