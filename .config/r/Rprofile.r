.First <- function() {
##  message("R is the best\n","working directory is:", getwd())
}

## Set CRAN mirror:
local({
  r <- getOption("repos")
  r["CRAN"] <- "https://cloud.r-project.org/"
  options(repos = r, Ncpus = 8)
})
