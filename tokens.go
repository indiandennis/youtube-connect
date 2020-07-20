package main

import (
	"errors"

	"github.com/dustin/go-broadcast"
)

type State struct {
	Url    string  `json:"url"`
	Paused bool    `json:"paused"`
	Volume float32 `json:"volume"`
	Time   float32 `json:"time"`
	Action int     `json:"action"`
	Mute   bool    `json:"mute"`
}

type Listener struct {
	Token string
	Chan  chan interface{}
}

type Update struct {
	token string
	state State
}

type Get struct {
	token    string
	response chan GetResponse
}

type GetResponse struct {
	state State
	err   error
}

type Manager struct {
	tokenState    map[string]*State
	tokenChannels map[string]broadcast.Broadcaster
	open          chan *Listener
	close         chan *Listener
	delete        chan string
	updates       chan *Update
	gets          chan *Get
}

func NewManager() *Manager {
	manager := &Manager{
		tokenState:    make(map[string]*State),
		tokenChannels: make(map[string]broadcast.Broadcaster),
		open:          make(chan *Listener, 100),
		close:         make(chan *Listener, 100),
		delete:        make(chan string, 100),
		updates:       make(chan *Update, 100),
		gets:          make(chan *Get, 100),
	}

	go manager.run()
	return manager
}

func (m *Manager) run() {
	for {
		select {
		case listener := <-m.open:
			m.register(listener)
		case listener := <-m.close:
			m.deregister(listener)
		case token := <-m.delete:
			m.deleteBroadcast(token)
			delete(m.tokenState, token)
		case update := <-m.updates:
			m.tokenState[update.token] = &update.state
			stateBroadcaster := m.token(update.token)
			if stateBroadcaster != nil {
				stateBroadcaster.Submit(update.state)
			}
		case get := <-m.gets:
			if m.tokenState[get.token] == nil {
				get.response <- GetResponse{err: errors.New("Invalid token")}
			} else {
				get.response <- GetResponse{state: *m.tokenState[get.token], err: nil}
			}
		}

	}
}

func (m *Manager) register(listener *Listener) {
	m.token(listener.Token).Register(listener.Chan)
}

func (m *Manager) deregister(listener *Listener) {
	m.token(listener.Token).Unregister(listener.Chan)
	close(listener.Chan)
}

func (m *Manager) deleteBroadcast(token string) {
	b, ok := m.tokenChannels[token]
	if ok {
		b.Submit(nil)
		b.Close()
		delete(m.tokenChannels, token)
	}
}

func (m *Manager) token(token string) broadcast.Broadcaster {
	b, ok := m.tokenChannels[token]
	if !ok {
		b = broadcast.NewBroadcaster(10)
		m.tokenChannels[token] = b
		m.tokenState[token] = &State{}
	}
	return b
}

func (m *Manager) OpenListener(token string) chan interface{} {
	listener := make(chan interface{})
	m.open <- &Listener{
		Token: token,
		Chan:  listener,
	}
	return listener
}

func (m *Manager) CloseListener(token string, channel chan interface{}) {
	m.close <- &Listener{
		Token: token,
		Chan:  channel,
	}
}

func (m *Manager) DeleteBroadcast(token string) {
	m.delete <- token
}

func (m *Manager) Update(token string, state State) {
	update := &Update{
		token: token,
		state: state,
	}
	m.updates <- update
}

func (m *Manager) Get(token string) (State, error) {
	response := make(chan GetResponse, 1)
	get := &Get{token: token, response: response}
	m.gets <- get

	getResponse := <-response
	return getResponse.state, getResponse.err
}
