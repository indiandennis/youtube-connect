package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"runtime"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var tokenManager *Manager

func main() {
	nuCPU := runtime.NumCPU()
	runtime.GOMAXPROCS(nuCPU)

	gin.SetMode(gin.ReleaseMode)
	tokenManager = NewManager()
	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/get/:token", getToken)
	r.GET("/generate", newToken)
	r.GET("/subscribe/:token", subscribeEvents)
	r.PUT("/update/:token", updateToken)
	r.DELETE("/delete/:token", deleteToken)
	r.Run(":80")

}

func getToken(c *gin.Context) {
	token := c.Param("token")
	state, err := tokenManager.Get(token)
	if err == nil {
		c.JSON(http.StatusOK, state)
	} else {
		c.Status(http.StatusNotFound)
	}
}

func subscribeEvents(c *gin.Context) {
	token := c.Param("token")
	_, err := tokenManager.Get(token)
	if err != nil {
		c.Status(http.StatusNotFound)
		log.Print(err)
		return
	}

	listener := tokenManager.OpenListener(token)
	defer tokenManager.CloseListener(token, listener)

	clientGone := c.Writer.CloseNotify()
	c.Stream(func(w io.Writer) bool {
		select {
		case <-clientGone:
			return false
		case state := <-listener:
			if state == nil {
				log.Println("Closing subscription")
				return false
			}
			jsonState, _ := json.Marshal(state)
			c.SSEvent("message", string(jsonState))
			return true
		}
	})
}

func newToken(c *gin.Context) {
	var token string
	var err, err2 error

	for timeout := 10; timeout > 0; timeout-- {
		token, err = GenerateRandomString(11)
		_, err2 = tokenManager.Get(token)
		if err == nil && err2 != nil {
			tokenManager.token(token)
			c.JSON(http.StatusOK, token)
			return
		}
	}
	c.Status(http.StatusInternalServerError)
}

func deleteToken(c *gin.Context) {
	token := c.Param("token")
	_, err := tokenManager.Get(token)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	tokenManager.DeleteBroadcast(token)
	c.Status(http.StatusOK)
}

func updateToken(c *gin.Context) {
	token := c.Param("token")

	state := &State{}
	err := c.BindJSON(state)
	if err != nil {
		log.Printf("Error binding JSON: %s", err)
		c.Status(http.StatusInternalServerError)
		return
	}

	_, err = tokenManager.Get(token)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	tokenManager.Update(token, *state)
	c.Status(http.StatusOK)
}
