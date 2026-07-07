package org.shagnik.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(
        name = "votes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"caption_id", "user_id"})
)
@Getter
@Setter
public class Vote {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caption_id", nullable = false)
    private Caption caption;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // SMALLINT in DB, CHECK (value IN (-1, 1)) — 0 is never persisted here
    @Column(name = "value", nullable = false)
    private Short value;
}